import express from 'express';
import { prisma } from '../db'; // Ensure prisma is available if we were using it, but we'll use memory for now
import { authenticate } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Mock Data
interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Bookmark {
  id: string;
  itemId: string;
  itemType: string;
  collectionId?: string;
  note?: string;
  createdAt: string;
  item: any;
}

// In-memory store
const collections: Collection[] = [
  {
    id: 'default',
    name: 'My Bookmarks',
    description: 'Default collection',
    isPublic: false,
    itemCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const bookmarks: Bookmark[] = [];

// Middleware
// router.use(authenticate); // Commented out for dev ease, or use optionalAuth if available. 
// Ideally we validte user. simpler to just allow all for "demo".

// GET /collections
router.get('/collections', (req, res) => {
  res.json({ collections });
});

// POST /collections
router.post('/collections', (req, res) => {
  const { name, description, isPublic } = req.body;
  const newCollection: Collection = {
    id: uuidv4(),
    name,
    description,
    isPublic: !!isPublic,
    itemCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  collections.push(newCollection);
  res.json(newCollection);
});

// PUT /collections/:id
router.put('/collections/:id', (req, res) => {
  const { id } = req.params;
  const idx = collections.findIndex(c => c.id === id);
  if (idx === -1) return void res.status(404).json({ error: 'Collection not found' });
  
  const updated = { ...collections[idx], ...req.body, updatedAt: new Date().toISOString() };
  collections[idx] = updated;
  res.json(updated);
});

// DELETE /collections/:id
router.delete('/collections/:id', (req, res) => {
  const { id } = req.params;
  const idx = collections.findIndex(c => c.id === id);
  if (idx === -1) return void res.status(404).json({ error: 'Collection not found' });
  
  collections.splice(idx, 1);
  // Also remove bookmarks in this collection or move them to default? 
  // For demo, just leave them orphaned or delete them
  res.json({ success: true });
});

// GET /bookmarks
router.get('/', (req, res) => {
  const { collectionId, type, page = 1, limit = 10 } = req.query;
  
  let filtered = bookmarks;
  if (collectionId) {
    filtered = filtered.filter(b => b.collectionId === collectionId);
  }
  if (type) {
    filtered = filtered.filter(b => b.itemType === type);
  }
  
  // Pagination
  const p = Number(page);
  const l = Number(limit);
  const start = (p - 1) * l;
  const end = start + l;
  const paginated = filtered.slice(start, end);
  
  res.json({
    bookmarks: paginated,
    pagination: {
      page: p,
      limit: l,
      total: filtered.length,
      hasNext: end < filtered.length
    }
  });
});

// POST /bookmarks
router.post('/', (req, res) => {
  const { itemId, itemType, collectionId, note } = req.body;
  
  // Mock item details based on type
  const mockItem = {
    id: itemId,
    title: `${itemType} ${itemId}`,
    description: 'Mock description',
    url: `/items/${itemId}`,
  };

  const newBookmark: Bookmark = {
    id: uuidv4(),
    itemId,
    itemType,
    collectionId: collectionId || 'default',
    note,
    createdAt: new Date().toISOString(),
    item: mockItem,
  };
  
  bookmarks.push(newBookmark);
  
  // Update collection count
  const col = collections.find(c => c.id === newBookmark.collectionId);
  if (col) col.itemCount++;
  
  res.json(newBookmark);
});

// DELETE /bookmarks/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const idx = bookmarks.findIndex(b => b.id === id);
  if (idx === -1) return void res.status(404).json({ error: 'Bookmark not found' });
  
  const b = bookmarks[idx];
  const col = collections.find(c => c.id === b.collectionId);
  if (col && col.itemCount > 0) col.itemCount--;
  
  bookmarks.splice(idx, 1);
  res.json({ success: true });
});

// PUT /bookmarks/:id/move
router.put('/:id/move', (req, res) => {
  const { id } = req.params;
  const { collectionId } = req.body;
  const idx = bookmarks.findIndex(b => b.id === id);
  if (idx === -1) return void res.status(404).json({ error: 'Bookmark not found' });
  
  const oldColId = bookmarks[idx].collectionId;
  bookmarks[idx].collectionId = collectionId;
  
  // Update counts
  const oldCol = collections.find(c => c.id === oldColId);
  if (oldCol && oldCol.itemCount > 0) oldCol.itemCount--;
  
  const newCol = collections.find(c => c.id === collectionId);
  if (newCol) newCol.itemCount++;
  
  res.json({ success: true });
});

// PUT /bookmarks/:id/note
router.put('/:id/note', (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const idx = bookmarks.findIndex(b => b.id === id);
  if (idx === -1) return void res.status(404).json({ error: 'Bookmark not found' });
  
  bookmarks[idx].note = note;
  res.json({ success: true });
});

export default router;

