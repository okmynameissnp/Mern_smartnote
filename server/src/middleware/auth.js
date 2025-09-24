import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
	if (!token) return res.status(401).json({ message: 'Missing token' });
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev');
		req.user = { id: payload.id };
		return next();
	} catch (err) {
		return res.status(401).json({ message: 'Invalid token' });
	}
}
