import dbConnect from './mongodb';
import Stock from '../models/Stock';
import DailyBar from '../models/DailyBar';
import { SMA, RSI } from 'technicalindicators';

export interface StrategyResult {
    ticker: string;
    close: number;
    rsi: number;
    ma50: number;
    ma200: number;
    date: Date;
}

export async function runTrendFollowingStrategy(targetDate: Date = new Date()): Promise<StrategyResult[]> {
    await dbConnect();

    console.log(`Running Trend Following Strategy for ${targetDate.toISOString().split('T')[0]}...`);

    // 1. Get all active tickers
    const stocks = await Stock.find({ active: true }).select('ticker').lean();
    const tickers = stocks.map(s => s.ticker);

    const results: StrategyResult[] = [];

    // 2. Process in batches to avoid memory issues
    const BATCH_SIZE = 50;
    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
        const batchTickers = tickers.slice(i, i + BATCH_SIZE);

        // 3. Fetch Data for batch
        // We need at least 200 days of data for MA200
        const startDate = new Date(targetDate);
        startDate.setDate(startDate.getDate() - 365); // Fetch 1 year to be safe

        const bars = await DailyBar.find({
            ticker: { $in: batchTickers },
            date: { $gte: startDate, $lte: targetDate }
        }).sort({ date: 1 }).lean();

        // Group bars by ticker
        const barsByTicker: Record<string, typeof bars> = {};
        bars.forEach(bar => {
            if (!barsByTicker[bar.ticker]) barsByTicker[bar.ticker] = [];
            barsByTicker[bar.ticker].push(bar);
        });

        // 4. Calculate Indicators and Filter
        for (const ticker of batchTickers) {
            const tickerBars = barsByTicker[ticker];
            if (!tickerBars || tickerBars.length < 200) continue;

            const closes = tickerBars.map(b => b.close);
            const lastBar = tickerBars[tickerBars.length - 1];

            // Ensure the last bar is actually close to targetDate (e.g. not stale data from 6 months ago)
            const diffTime = Math.abs(targetDate.getTime() - lastBar.date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 5) continue; // Skip if data is too old

            // Calculate SMA50
            const sma50Values = SMA.calculate({ period: 50, values: closes });
            const ma50 = sma50Values[sma50Values.length - 1];

            // Calculate SMA200
            const sma200Values = SMA.calculate({ period: 200, values: closes });
            const ma200 = sma200Values[sma200Values.length - 1];

            // Calculate RSI 14
            const rsiValues = RSI.calculate({ period: 14, values: closes });
            const rsi = rsiValues[rsiValues.length - 1];

            // STRATEGY LOGIC:
            // 1. Price > MA50 > MA200 (Uptrend)
            // 2. RSI between 50 and 70 (Strong but not overbought)

            if (
                lastBar.close > ma50 &&
                ma50 > ma200 &&
                rsi >= 50 &&
                rsi <= 70
            ) {
                results.push({
                    ticker,
                    close: lastBar.close,
                    rsi,
                    ma50,
                    ma200,
                    date: lastBar.date
                });
            }
        }
    }

    return results;
}
