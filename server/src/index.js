import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import noteRoutes from './routes/note.routes.js';

dotenv.config();

const app = express();

const defaultOrigins = ['http://localhost:5173', 'http://localhost:5175'];
const envOrigins = (process.env.CORS_ORIGIN || '')
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean);
const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;

app.use(
	cors({
		origin: function (origin, callback) {
			if (!origin) return callback(null, true);
			const isExplicit = allowedOrigins.includes(origin);
			const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
			if (isExplicit || isLocalhost) return callback(null, true);
			return callback(new Error('Not allowed by CORS'));
		},
		credentials: true,
	})
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
	res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api', noteRoutes);

const PORT = Number(process.env.PORT || 5000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zikra_smart_notes';

async function start() {
	try {
		await mongoose.connect(MONGODB_URI);
		console.log('MongoDB connected');
		app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
	} catch (err) {
		console.error('Failed to start server', err);
		process.exit(1);
	}
}

start();
