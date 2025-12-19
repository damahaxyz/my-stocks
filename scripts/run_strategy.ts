import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { runTrendFollowingStrategy } from '../src/lib/strategy';

async function main() {
    try {
        const results = await runTrendFollowingStrategy();
        console.log('--- Strategy Results ---');
        console.table(results.map(r => ({
            Ticker: r.ticker,
            Close: r.close.toFixed(2),
            RSI: r.rsi.toFixed(2),
            MA50: r.ma50.toFixed(2),
            MA200: r.ma200.toFixed(2)
        })));
        console.log(`Total Matches: ${results.length}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
