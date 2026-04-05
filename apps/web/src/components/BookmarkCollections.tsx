'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { Button } from './Button';
import { Modal } from './Modal';
import Toast, { useToast } from './Toast';

/**
 * BookmarkCollections - Comprehensive bookmark and collection management
 * 
 * Features:
 * - Create/edit/delete collections
 * - Bookmark jobs, courses, stories, posts, resources
 * - Organize bookmarks into collections
 * - Add notes to bookmarks
 * - Share public collections
 */

interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  itemCount: number;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

interface Bookmark {
  id: string;
  itemId: string;
  itemType: 'job' | 'course' | 'story' | 'post' | 'resource';
  collectionId?: string;
  note?: string;
  createdAt: string;
  item: {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    url?: string;
  };
}

interface BookmarksResponse {
  bookmarks: Bookmark[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

interface CollectionsResponse {
  collections: Collection[];
}

// API functions
const bookmarksApi = {
  async getCollections(): Promise<CollectionsResponse> {
    const { ok, data } = await api<CollectionsResponse>('/bookmarks/collections');
    if (!ok) throw new Error('Failed to fetch collections');
    return data!;
  },

  async createCollection(data: { name: string; description?: string; isPublic?: boolean }): Promise<Collection> {
    const { ok, data: result } = await api<Collection>('/bookmarks/collections', {
      method: 'POST',
      body: data,
    });
    if (!ok) throw new Error('Failed to create collection');
    return result!;
  },

  async updateCollection(id: string, data: { name?: string; description?: string; isPublic?: boolean }): Promise<Collection> {
    const { ok, data: result } = await api<Collection>('/bookmarks/collections/' + id, {
      method: 'PUT',
      body: data,
    });
    if (!ok) throw new Error('Failed to update collection');
    return result!;
  },

  async deleteCollection(id: string): Promise<void> {
    const { ok } = await api('/bookmarks/collections/' + id, {
      method: 'DELETE',
    });
    if (!ok) throw new Error('Failed to delete collection');
  },

  async getBookmarks(params: { collectionId?: string; type?: string; page?: number; limit?: number } = {}): Promise<BookmarksResponse> {
    const query = new URLSearchParams();
    if (params.collectionId) query.append('collectionId', params.collectionId);
    if (params.type) query.append('type', params.type);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    
    const { ok, data } = await api<BookmarksResponse>('/bookmarks?' + query.toString());
    if (!ok) throw new Error('Failed to fetch bookmarks');
    return data!;
  },

  async addBookmark(data: { itemId: string; itemType: string; collectionId?: string; note?: string }): Promise<Bookmark> {
    const { ok, data: result } = await api<Bookmark>('/bookmarks', {
      method: 'POST',
      body: data,
    });
    if (!ok) throw new Error('Failed to add bookmark');
    return result!;
  },

  async removeBookmark(id: string): Promise<void> {
    const { ok } = await api('/bookmarks/' + id, {
      method: 'DELETE',
    });
    if (!ok) throw new Error('Failed to remove bookmark');
  },

  async moveBookmark(id: string, collectionId: string): Promise<void> {
    const { ok } = await api('/bookmarks/' + id + '/move', {
      method: 'PUT',
      body: { collectionId },
    });
    if (!ok) throw new Error('Failed to move bookmark');
  },

  async updateBookmarkNote(id: string, note: string): Promise<void> {
    const { ok } = await api('/bookmarks/' + id + '/note', {
      method: 'PUT',
      body: { note },
    });
    if (!ok) throw new Error('Failed to update note');
  },
};

// Item type icons
const typeIcons: Record<string, React.ReactNode> = {
  job: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  course: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M12 14l9-5-9-5-9 5 9 5z" />
      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
    </svg>
  ),
  story: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  post: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  ),
  resource: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

// Collection Card Component
function CollectionCard({ 
  collection, 
  isSelected,
  onClick,
  onEdit,
  onDelete,
}: { 
  collection: Collection;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div 
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {collection.name}
            </h3>
            {collection.isPublic && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                Public
              </span>
            )}
          </div>
          {collection.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {collection.description}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            {collection.itemCount} item{collection.itemCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            aria-label="Edit collection"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded"
            aria-label="Delete collection"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Bookmark Item Component
function BookmarkItem({ 
  bookmark,
  onRemove,
  onMoveToCollection,
  onUpdateNote,
}: { 
  bookmark: Bookmark;
  onRemove: () => void;
  onMoveToCollection: () => void;
  onUpdateNote: (note: string) => void;
}) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(bookmark.note || '');

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-4">
        {/* Type Icon */}
        <div className={`flex-shrink-0 p-2 rounded-lg ${
          bookmark.itemType === 'job' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
          bookmark.itemType === 'course' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
          bookmark.itemType === 'story' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
          bookmark.itemType === 'post' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {typeIcons[bookmark.itemType]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {bookmark.item.title}
          </h4>
          {bookmark.item.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {bookmark.item.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
            <span className="capitalize">{bookmark.itemType}</span>
            <span>Saved {new Date(bookmark.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNote(!showNote)}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
              bookmark.note ? 'text-yellow-500' : 'text-gray-400'
            }`}
            aria-label="Add note"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onMoveToCollection}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Move to collection"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Remove bookmark"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Note Section */}
      {showNote && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg 
              bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
              focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                onUpdateNote(note);
                setShowNote(false);
              }}
            >
              Save Note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export function BookmarkCollections() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // State
  const [collections, setCollections] = useState<Collection[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionIsPublic, setNewCollectionIsPublic] = useState(false);

  // Load collections
  const loadCollections = useCallback(async () => {
    try {
      const data = await bookmarksApi.getCollections();
      setCollections(data.collections);
    } catch (error) {
      console.error('Failed to load collections:', error);
      addToast('Failed to load collections', 'error');
    }
  }, [addToast]);

  // Load bookmarks
  const loadBookmarks = useCallback(async () => {
    setIsLoadingBookmarks(true);
    try {
      const params: any = {};
      if (selectedCollectionId) params.collectionId = selectedCollectionId;
      if (selectedType !== 'all') params.type = selectedType;
      
      const data = await bookmarksApi.getBookmarks(params);
      setBookmarks(data.bookmarks);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      addToast('Failed to load bookmarks', 'error');
    } finally {
      setIsLoadingBookmarks(false);
    }
  }, [selectedCollectionId, selectedType, addToast]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadCollections();
      await loadBookmarks();
      setIsLoading(false);
    };
    init();
  }, [loadCollections, loadBookmarks]);

  // Reload bookmarks when filters change
  useEffect(() => {
    if (!isLoading) {
      loadBookmarks();
    }
  }, [selectedCollectionId, selectedType, loadBookmarks, isLoading]);

  // Create collection
  const handleCreateCollection = async () => {
    try {
      await bookmarksApi.createCollection({
        name: newCollectionName,
        description: newCollectionDescription || undefined,
        isPublic: newCollectionIsPublic,
      });
      addToast('Collection created', 'success');
      setShowCreateModal(false);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setNewCollectionIsPublic(false);
      loadCollections();
    } catch (error) {
      addToast('Failed to create collection', 'error');
    }
  };

  // Update collection
  const handleUpdateCollection = async () => {
    if (!editingCollection) return;
    try {
      await bookmarksApi.updateCollection(editingCollection.id, {
        name: newCollectionName,
        description: newCollectionDescription || undefined,
        isPublic: newCollectionIsPublic,
      });
      addToast('Collection updated', 'success');
      setEditingCollection(null);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setNewCollectionIsPublic(false);
      loadCollections();
    } catch (error) {
      addToast('Failed to update collection', 'error');
    }
  };

  // Delete collection
  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection? Bookmarks will be kept.')) return;
    try {
      await bookmarksApi.deleteCollection(id);
      addToast('Collection deleted', 'success');
      if (selectedCollectionId === id) setSelectedCollectionId(null);
      loadCollections();
    } catch (error) {
      addToast('Failed to delete collection', 'error');
    }
  };

  // Remove bookmark
  const handleRemoveBookmark = async (id: string) => {
    try {
      await bookmarksApi.removeBookmark(id);
      setBookmarks(prev => prev.filter(b => b.id !== id));
      addToast('Bookmark removed', 'success');
      loadCollections(); // Refresh counts
    } catch (error) {
      addToast('Failed to remove bookmark', 'error');
    }
  };

  // Update bookmark note
  const handleUpdateNote = async (id: string, note: string) => {
    try {
      await bookmarksApi.updateBookmarkNote(id, note);
      setBookmarks(prev => prev.map(b => b.id === id ? { ...b, note } : b));
      addToast('Note saved', 'success');
    } catch (error) {
      addToast('Failed to save note', 'error');
    }
  };

  // Open edit modal
  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection);
    setNewCollectionName(collection.name);
    setNewCollectionDescription(collection.description || '');
    setNewCollectionIsPublic(collection.isPublic);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bookmarks & Collections
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Organize and manage your saved items
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Collection
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Collections Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Collections</h2>
          
          {/* All Bookmarks */}
          <div
            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedCollectionId === null
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setSelectedCollectionId(null)}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="font-medium text-gray-900 dark:text-white">All Bookmarks</span>
            </div>
          </div>

          {/* Collection List */}
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              isSelected={selectedCollectionId === collection.id}
              onClick={() => setSelectedCollectionId(collection.id)}
              onEdit={() => openEditModal(collection)}
              onDelete={() => handleDeleteCollection(collection.id)}
            />
          ))}

          {collections.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No collections yet. Create one to organize your bookmarks!
            </p>
          )}
        </div>

        {/* Bookmarks List */}
        <div className="lg:col-span-3">
          {/* Type Filter */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
            {['all', 'job', 'course', 'story', 'post', 'resource'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 text-sm rounded-full transition-colors capitalize ${
                  selectedType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {type === 'all' ? 'All' : type}
              </button>
            ))}
          </div>

          {/* Bookmarks */}
          {isLoadingBookmarks ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : bookmarks.length > 0 ? (
            <div className="space-y-3">
              {bookmarks.map((bookmark) => (
                <BookmarkItem
                  key={bookmark.id}
                  bookmark={bookmark}
                  onRemove={() => handleRemoveBookmark(bookmark.id)}
                  onMoveToCollection={() => {
                    // Would open a modal to select collection
                  }}
                  onUpdateNote={(note) => handleUpdateNote(bookmark.id, note)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No bookmarks yet</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Save jobs, courses, stories, and more to find them later!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Collection Modal */}
      <Modal
        isOpen={showCreateModal || !!editingCollection}
        onClose={() => {
          setShowCreateModal(false);
          setEditingCollection(null);
          setNewCollectionName('');
          setNewCollectionDescription('');
          setNewCollectionIsPublic(false);
        }}
        title={editingCollection ? 'Edit Collection' : 'New Collection'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="My Collection"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={newCollectionDescription}
              onChange={(e) => setNewCollectionDescription(e.target.value)}
              placeholder="What's this collection for?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={newCollectionIsPublic}
              onChange={(e) => setNewCollectionIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">
              Make this collection public (others can view it)
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingCollection(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingCollection ? handleUpdateCollection : handleCreateCollection}
              disabled={!newCollectionName.trim()}
            >
              {editingCollection ? 'Save Changes' : 'Create Collection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default BookmarkCollections;
