require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { signUser, requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

const publicUser = row => ({ id: row.id, name: row.name, email: row.email });

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Blog Platform API' }));

// Authentication
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, valid email and password (6+ characters) are required.' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)')
      .run(name.trim(), email.trim().toLowerCase(), hash);
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ user, token: signUser(user) });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email is already registered.' });
    res.status(500).json({ error: 'Could not create account.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const safe = publicUser(user);
  res.json({ user: safe, token: signUser(safe) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

// Posts
app.get('/api/posts', (req, res) => {
  const posts = db.prepare(`
    SELECT p.id, p.title, p.content, p.author_id, p.created_at, p.updated_at,
           u.name AS author_name,
           COUNT(c.id) AS comment_count
    FROM posts p
    JOIN users u ON u.id = p.author_id
    LEFT JOIN comments c ON c.post_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(posts);
});

app.get('/api/posts/:id', (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.name AS author_name, u.email AS author_email
    FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?
  `).get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const comments = db.prepare(`
    SELECT c.id, c.content, c.post_id, c.author_id, c.created_at, u.name AS author_name
    FROM comments c JOIN users u ON u.id = c.author_id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json({ post, comments });
});

app.post('/api/posts', requireAuth, (req, res) => {
  const { title, content } = req.body || {};
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: 'Title and content are required.' });
  const result = db.prepare('INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)')
    .run(title.trim(), content.trim(), req.user.id);
  const post = db.prepare(`SELECT p.*, u.name AS author_name FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=?`).get(result.lastInsertRowid);
  res.status(201).json(post);
});

app.put('/api/posts/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.author_id !== req.user.id) return res.status(403).json({ error: 'You can edit only your own posts.' });
  const { title, content } = req.body || {};
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: 'Title and content are required.' });
  db.prepare('UPDATE posts SET title=?, content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(title.trim(), content.trim(), req.params.id);
  res.json(db.prepare(`SELECT p.*, u.name AS author_name FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=?`).get(req.params.id));
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.author_id !== req.user.id) return res.status(403).json({ error: 'You can delete only your own posts.' });
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  res.json({ message: 'Post deleted successfully.' });
});

// Comments
app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  const content = req.body?.content?.trim();
  if (!content) return res.status(400).json({ error: 'Comment cannot be empty.' });
  const result = db.prepare('INSERT INTO comments (content, post_id, author_id) VALUES (?, ?, ?)')
    .run(content, req.params.id, req.user.id);
  const comment = db.prepare(`SELECT c.*, u.name AS author_name FROM comments c JOIN users u ON u.id=c.author_id WHERE c.id=?`).get(result.lastInsertRowid);
  res.status(201).json(comment);
});

app.put('/api/comments/:id', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id=?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });
  if (comment.author_id !== req.user.id) return res.status(403).json({ error: 'You can edit only your own comments.' });
  const content = req.body?.content?.trim();
  if (!content) return res.status(400).json({ error: 'Comment cannot be empty.' });
  db.prepare('UPDATE comments SET content=? WHERE id=?').run(content, req.params.id);
  res.json(db.prepare(`SELECT c.*, u.name AS author_name FROM comments c JOIN users u ON u.id=c.author_id WHERE c.id=?`).get(req.params.id));
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id=?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });
  if (comment.author_id !== req.user.id) return res.status(403).json({ error: 'You can delete only your own comments.' });
  db.prepare('DELETE FROM comments WHERE id=?').run(req.params.id);
  res.json({ message: 'Comment deleted successfully.' });
});

app.get('*', (req, res) => res.sendFile(require('path').join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Blog Platform running at http://localhost:${PORT}`));
