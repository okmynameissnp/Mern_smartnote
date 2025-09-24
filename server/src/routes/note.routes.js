import express from 'express';
import Note from '../models/Note.js';
import { requireAuth } from '../middleware/auth.js';
import { summarizeText } from '../services/summarize.js';

const router = express.Router();

router.post('/note', requireAuth, async (req, res) => {
	try {
        const { noteText, noteHtml, tags } = req.body || {};
        const stripHtml = (html = '') => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const finalText = (noteText && noteText.trim()) ? noteText.trim() : stripHtml(noteHtml);
        if (!finalText) return res.status(400).json({ message: 'noteText required' });
		const cleanTags = Array.isArray(tags) ? tags.filter(Boolean).map((t) => String(t).trim()).slice(0, 10) : [];
        const summary = await summarizeText(finalText);
        const note = await Note.create({ userId: req.user.id, noteText: finalText, noteHtml: noteHtml || '', summary, tags: cleanTags });
		return res.status(201).json(note);
	} catch (err) {
		return res.status(500).json({ message: 'Failed to create note' });
	}
});

router.put('/note/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;
        const { noteText, noteHtml, tags } = req.body || {};
        const stripHtml = (html = '') => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const finalText = (noteText && noteText.trim()) ? noteText.trim() : stripHtml(noteHtml);
        if (!finalText) return res.status(400).json({ message: 'noteText required' });
		const cleanTags = Array.isArray(tags) ? tags.filter(Boolean).map((t) => String(t).trim()).slice(0, 10) : [];
        const summary = await summarizeText(finalText);
		const note = await Note.findOneAndUpdate(
			{ _id: id, userId: req.user.id },
            { noteText: finalText, noteHtml: noteHtml || '', summary, tags: cleanTags },
			{ new: true }
		);
		if (!note) return res.status(404).json({ message: 'Note not found' });
		return res.json(note);
	} catch (err) {
		return res.status(500).json({ message: 'Failed to update note' });
	}
});

router.get('/notes', requireAuth, async (req, res) => {
	try {
		const { q, tag } = req.query || {};
		const criteria = { userId: req.user.id };
		if (q && String(q).trim()) {
			criteria.$text = { $search: String(q).trim() };
		}
		if (tag && String(tag).trim()) {
			criteria.tags = String(tag).trim();
		}
		const notes = await Note.find(criteria).sort({ createdAt: -1 });
		return res.json(notes);
	} catch (err) {
		return res.status(500).json({ message: 'Failed to fetch notes' });
	}
});

router.delete('/note/:id', requireAuth, async (req, res) => {
	try {
		const { id } = req.params;
		const note = await Note.findOneAndDelete({ _id: id, userId: req.user.id });
		if (!note) return res.status(404).json({ message: 'Note not found' });
		return res.json({ message: 'Deleted' });
	} catch (err) {
		return res.status(500).json({ message: 'Failed to delete note' });
	}
});

export default router;
