import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		noteText: { type: String, required: true },
		noteHtml: { type: String, default: '' },
		summary: { type: String, default: '' },
		tags: { type: [String], default: [], index: true },
	},
	{ timestamps: true }
);

noteSchema.index({ noteText: 'text', summary: 'text' });

export default mongoose.model('Note', noteSchema);
