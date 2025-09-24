import axios from 'axios';

const HF_MODEL = process.env.HUGGINGFACE_SUMMARIZATION_MODEL || 'facebook/bart-large-cnn';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || '';

export async function summarizeText(text) {
	const trimmed = (text || '').trim();
	if (!trimmed) return '';

	// Simple early return for short text
	if (trimmed.split(/\s+/).length < 10) return trimmed;

	try {
		const resp = await axios.post(
			`https://api-inference.huggingface.co/models/${encodeURIComponent(HF_MODEL)}`,
			{ inputs: trimmed },
			{ headers: { Authorization: HF_API_KEY ? `Bearer ${HF_API_KEY}` : undefined } }
		);
		const data = resp.data;
		if (Array.isArray(data) && data[0]?.summary_text) {
			return data[0].summary_text;
		}
		if (data?.summary_text) return data.summary_text;
		return trimmed.slice(0, 180);
	} catch (err) {
		return trimmed.slice(0, 180);
	}
}
