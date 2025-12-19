import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStock extends Document {
    ticker: string;
    name: string;
    market: string;
    locale: string;
    primary_exchange: string;
    type: string;
    active: boolean;
    currency_name: string;
    cik?: string;
    composite_figi?: string;
    share_class_figi?: string;
    last_updated_utc: Date;
}

const StockSchema: Schema = new Schema({
    ticker: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    market: { type: String, required: true },
    locale: { type: String, required: true },
    primary_exchange: { type: String },
    type: { type: String },
    active: { type: Boolean, default: true },
    currency_name: { type: String },
    cik: { type: String },
    composite_figi: { type: String },
    share_class_figi: { type: String },
    last_updated_utc: { type: Date, default: Date.now },
});

// Prevent model recompilation error in Next.js development
const Stock: Model<IStock> = mongoose.models.Stock || mongoose.model<IStock>('Stock', StockSchema);

export default Stock;
