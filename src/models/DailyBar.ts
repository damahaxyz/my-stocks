import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyBar extends Document {
    ticker: string;
    date: Date; // The date of the bar (time set to 00:00:00 UTC)
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    vwap?: number;
    transactions?: number;
}

const DailyBarSchema: Schema = new Schema({
    ticker: { type: String, required: true, index: true }, // Not unique alone, but unique with date
    date: { type: Date, required: true, index: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volume: { type: Number, required: true },
    vwap: { type: Number },
    transactions: { type: Number },
});

// Compound index for efficient querying and preventing duplicates
DailyBarSchema.index({ ticker: 1, date: 1 }, { unique: true });

// Prevent model recompilation error in Next.js development
const DailyBar: Model<IDailyBar> = mongoose.models.DailyBar || mongoose.model<IDailyBar>('DailyBar', DailyBarSchema);

export default DailyBar;
