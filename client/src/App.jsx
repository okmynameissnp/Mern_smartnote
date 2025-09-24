import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:5000/api'

function useTheme() {
	const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark')
		localStorage.setItem('theme', theme)
	}, [theme])
	return { theme, setTheme }
}

function useAuth() {
	const [token, setToken] = useState(() => localStorage.getItem('token') || '')
	const [user, setUser] = useState(() => {
		const raw = localStorage.getItem('user')
		return raw ? JSON.parse(raw) : null
	})

	const login = useCallback((t, u) => {
		setToken(t)
		setUser(u)
		localStorage.setItem('token', t)
		localStorage.setItem('user', JSON.stringify(u))
	}, [])

	const logout = useCallback(() => {
		setToken('')
		setUser(null)
		localStorage.removeItem('token')
		localStorage.removeItem('user')
	}, [])

	return { token, user, login, logout }
}

function useSpeechToText() {
	const [listening, setListening] = useState(false)
	const [supported, setSupported] = useState(false)
	const [partialText, setPartialText] = useState('')
	const recognitionRef = useRef(null)

	useEffect(() => {
		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
		if (SpeechRecognition) {
			const recog = new SpeechRecognition()
			recog.continuous = true
			recog.interimResults = true
			recog.lang = 'en-US'
			recognitionRef.current = recog
			setSupported(true)
		}
	}, [])

	const start = useCallback((onText) => {
		if (!recognitionRef.current) return
		setPartialText('')
		const recog = recognitionRef.current
		recog.onresult = (e) => {
			let interim = ''
			for (let i = e.resultIndex; i < e.results.length; i++) {
				const res = e.results[i]
				const transcript = res[0]?.transcript || ''
				if (res.isFinal) {
					onText(transcript)
				} else {
					interim += transcript
				}
			}
			setPartialText(interim)
		}
		recog.onend = () => {
			if (listening) {
				try { recog.start() } catch {}
			}
		}
		try { recog.start() } catch {}
		setListening(true)
	}, [listening])

	const stop = useCallback(() => {
		if (!recognitionRef.current) return
		recognitionRef.current.onend = null
		recognitionRef.current.stop()
		setListening(false)
		setPartialText('')
	}, [])

	return { supported, listening, start, stop, partialText }
}

function speak(text) {
	if (!text) return
	const utter = new SpeechSynthesisUtterance(text)
	utter.lang = 'en-US'
	speechSynthesis.cancel()
	speechSynthesis.speak(utter)
}

async function api(path, { method = 'GET', body, token } = {}) {
	const res = await fetch(`${API_BASE}${path}`, {
		method,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	})
	if (!res.ok) {
		let message = res.statusText
		try {
			const data = await res.json()
			message = data?.message || message
		} catch {
			try { message = await res.text() } catch {}
		}
		throw new Error(message || 'Request failed')
	}
	return await res.json()
}

function TagChips({ tags, onRemove }) {
	if (!tags?.length) return null
	return (
		<div className="row" style={{ flexWrap: 'wrap' }}>
			{tags.map((t, i) => (
				<button key={i} className="link" onClick={() => onRemove(i)} style={{ border: '1px solid rgba(148,163,184,0.3)', padding: '4px 8px', borderRadius: 999 }}>
					#{t} ✕
				</button>
			))}
		</div>
	)
}

function AuthView({ onAuthed }) {
	const [isLogin, setIsLogin] = useState(true)
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const submit = async (e) => {
		e.preventDefault()
		setError('')
		setLoading(true)
		try {
			if (isLogin) {
				const data = await api('/auth/login', { method: 'POST', body: { email, password } })
				onAuthed(data.token, data.user)
			} else {
				const data = await api('/auth/register', { method: 'POST', body: { name, email, password } })
				onAuthed(data.token, data.user)
			}
		} catch (err) {
			setError(err?.message || 'Authentication failed')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="container">
			<h2>{isLogin ? 'Login' : 'Register'}</h2>
			<form onSubmit={submit} className="card">
				{!isLogin && (
					<input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
				)}
				<input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
				<input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
				{error && <div className="error">{error}</div>}
				<button disabled={loading} type="submit">{loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}</button>
			</form>
			<button className="link" onClick={() => setIsLogin((v) => !v)}>
				{isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
			</button>
		</div>
	)
}

function Dashboard({ token, user, onLogout }) {
	const [notes, setNotes] = useState([])
	const [noteText, setNoteText] = useState('')
	const [noteHtml, setNoteHtml] = useState('')
	const [editingId, setEditingId] = useState('')
	const [saving, setSaving] = useState(false)
	const [tagInput, setTagInput] = useState('')
	const [tags, setTags] = useState([])
	const [search, setSearch] = useState('')
	const [activeTag, setActiveTag] = useState('')
	const { supported, listening, start, stop, partialText } = useSpeechToText()
	const { theme, setTheme } = useTheme()

	const load = useCallback(async () => {
		try {
			const params = new URLSearchParams()
			if (search.trim()) params.set('q', search.trim())
			if (activeTag.trim()) params.set('tag', activeTag.trim())
			const data = await api(`/notes?${params.toString()}`, { token })
			setNotes(data)
		} catch {}
	}, [token, search, activeTag])

	useEffect(() => { load() }, [load])

	const onMicText = (t) => setNoteText((prev) => (prev ? prev + ' ' + t : t))

	const commitTagInput = () => {
		const parts = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
		if (!parts.length) return
		const next = Array.from(new Set([...(tags || []), ...parts])).slice(0, 10)
		setTags(next)
		setTagInput('')
	}

	const saveNote = async () => {
		if (!noteText.trim()) return
		setSaving(true)
		try {
			if (editingId) {
				await api(`/note/${editingId}`, { method: 'PUT', body: { noteText, noteHtml, tags }, token })
			} else {
				await api('/note', { method: 'POST', body: { noteText, noteHtml, tags }, token })
			}
			setNoteText('')
			setNoteHtml('')
			setEditingId('')
			setTags([])
			await load()
		} catch {} finally {
			setSaving(false)
		}
	}

	const delNote = async (id) => {
		try {
			await api(`/note/${id}`, { method: 'DELETE', token })
			await load()
		} catch {}
	}

	const startEdit = (n) => {
		setEditingId(n._id)
		setNoteText(n.noteText)
		setNoteHtml(n.noteHtml || '')
		setTags(n.tags || [])
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	const removeTagAt = (idx) => {
		setTags((cur) => cur.filter((_, i) => i !== idx))
	}

	return (
		<div className="container">
			<div className="row between">
				<h2>Smart Notes</h2>
				<div className="row">
					<input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} />
					<button onClick={() => setActiveTag('')}>All</button>
					{Array.from(new Set(notes.flatMap((n) => n.tags || []))).slice(0, 8).map((t) => (
						<button key={t} onClick={() => setActiveTag(t)} className="link" style={{ border: '1px solid rgba(148,163,184,0.3)', padding: '4px 8px', borderRadius: 999 }}>#{t}</button>
					))}
					<button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Dark' : 'Light'} Mode</button>
					<span style={{ marginLeft: 12 }}>{user?.name}</span>
					<button onClick={onLogout}>Logout</button>
				</div>
			</div>

			<div className="card">
				{editingId ? <h3>Editing Note</h3> : <h3>New Note</h3>}
				<textarea rows={6} placeholder="Type your note or use the mic..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
				{listening && partialText && (
					<div className="summary"><strong>Listening…</strong> {partialText}</div>
				)}
				<div className="row">
					<input placeholder="Add tags (comma separated)" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onBlur={commitTagInput} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitTagInput(); } }} />
					<button onClick={commitTagInput}>Add Tags</button>
				</div>
				<TagChips tags={tags} onRemove={removeTagAt} />
				<div className="row">
					{supported && !listening && <button onClick={() => start(onMicText)}>Start Mic</button>}
					{supported && listening && <button onClick={stop}>Stop Mic</button>}
					<button disabled={saving} onClick={saveNote}>{saving ? 'Saving...' : (editingId ? 'Update Note' : 'Save Note')}</button>
					{editingId && <button onClick={() => { setEditingId(''); setNoteText(''); setTags([]); }}>Cancel</button>}
				</div>
			</div>

			<h3>Your Notes</h3>
			<div className="grid">
				{notes.map((n) => (
					<div key={n._id} className="card">
						<div className="row between"><strong>{new Date(n.createdAt).toLocaleString()}</strong>
							<div className="row">
								<button onClick={() => startEdit(n)}>Edit</button>
								<button onClick={() => delNote(n._id)}>Delete</button>
							</div>
						</div>
						<p style={{ whiteSpace: 'pre-wrap' }}>{n.noteText}</p>
						{!!(n.tags?.length) && (
							<div className="row" style={{ flexWrap: 'wrap' }}>
								{n.tags.map((t, i) => (
									<button key={i} className="link" onClick={() => setActiveTag(t)} style={{ border: '1px solid rgba(148,163,184,0.3)', padding: '4px 8px', borderRadius: 999 }}>#{t}</button>
								))}
							</div>
						)}
						{n.summary && (
							<div className="summary">
								<strong>Summary:</strong> {n.summary}
								<div className="row"><button onClick={() => speak(n.summary)}>Play Summary</button></div>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}

function App() {
	const { token, user, login, logout } = useAuth()
	if (!token) return <AuthView onAuthed={login} />
	return <Dashboard token={token} user={user} onLogout={logout} />
}

export default App
