// @ts-nocheck
/**
 * Social Stories Module
 * 
 * Instagram-style ephemeral stories that expire after 24 hours:
 * - Create photo/video/text stories
 * - Auto-expiry after 24 hours
 * - View tracking and analytics
 * - Story highlights (saved stories)
 * - Privacy controls (who can view)
 */

import express from 'express';
import { prisma } from '../db';
import authenticateJWT from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// In-memory store for stories (would be Redis/DB in production)
interface SocialStory {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    type: 'image' | 'video' | 'text';
    mediaUrl?: string;
    text?: string;
    backgroundColor?: string;
    fontStyle?: string;
    duration: number; // Display duration in seconds (default 5)
    viewerIds: Set<string>;
    viewCount: number;
    reactions: Map<string, string>; // userId -> reaction emoji
    createdAt: Date;
    expiresAt: Date;
    visibility: 'public' | 'connections' | 'close_friends' | 'private';
    isHighlight: boolean;
    highlightName?: string;
}

// In-memory storage (replace with Redis/DB in production)
const storiesStore = new Map<string, SocialStory>();
const userStories = new Map<string, string[]>(); // userId -> storyIds

// Story expiry duration (24 hours in milliseconds)
const STORY_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Default story display duration in seconds
const DEFAULT_DURATION = 5;

/**
 * Clean up expired stories
 */
function cleanupExpiredStories() {
    const now = new Date();
    
    for (const [storyId, story] of storiesStore.entries()) {
        if (story.expiresAt < now && !story.isHighlight) {
            // Remove from user's stories list
            const userStoryIds = userStories.get(story.authorId);
            if (userStoryIds) {
                const index = userStoryIds.indexOf(storyId);
                if (index > -1) {
                    userStoryIds.splice(index, 1);
                }
            }
            
            // Remove from store
            storiesStore.delete(storyId);
            
            console.log(`Story ${storyId} expired and removed`);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredStories, 5 * 60 * 1000);

/**
 * POST /social-stories - Create a new story
 */
router.post('/', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            type, 
            mediaUrl, 
            text, 
            backgroundColor, 
            fontStyle, 
            duration, 
            visibility,
            expiryHours 
        } = req.body;
        
        if (!type || !['image', 'video', 'text'].includes(type)) {
            return void res.status(400).json({ error: 'Valid type (image, video, text) is required' });
        }
        
        if (type === 'text' && !text) {
            return void res.status(400).json({ error: 'Text is required for text stories' });
        }
        
        if ((type === 'image' || type === 'video') && !mediaUrl) {
            return void res.status(400).json({ error: 'mediaUrl is required for image/video stories' });
        }
        
        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, avatarUrl: true }
        });
        
        if (!user) {
            return void res.status(404).json({ error: 'User not found' });
        }
        
        const storyId = crypto.randomUUID();
        const now = new Date();
        const expiryMs = (expiryHours || 24) * 60 * 60 * 1000;
        
        const story: SocialStory = {
            id: storyId,
            authorId: userId,
            authorName: user.name || 'Anonymous',
            authorAvatar: user.avatarUrl || undefined,
            type,
            mediaUrl,
            text,
            backgroundColor: backgroundColor || '#1a1a2e',
            fontStyle: fontStyle || 'normal',
            duration: duration || DEFAULT_DURATION,
            viewerIds: new Set(),
            viewCount: 0,
            reactions: new Map(),
            createdAt: now,
            expiresAt: new Date(now.getTime() + expiryMs),
            visibility: visibility || 'connections',
            isHighlight: false
        };
        
        // Store the story
        storiesStore.set(storyId, story);
        
        // Add to user's stories list
        if (!userStories.has(userId)) {
            userStories.set(userId, []);
        }
        userStories.get(userId)!.push(storyId);
        
        res.status(201).json({
            ok: true,
            story: {
                id: story.id,
                type: story.type,
                createdAt: story.createdAt,
                expiresAt: story.expiresAt,
                visibility: story.visibility
            }
        });
    } catch (error) {
        console.error('Error creating story:', error);
        res.status(500).json({ error: 'Failed to create story' });
    }
});

/**
 * GET /social-stories/feed - Get stories from connections
 */
router.get('/feed', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        
        // Get user's connections
        const connections = await prisma.userConnection.findMany({
            where: {
                OR: [
                    { requesterId: userId, status: 'ACCEPTED' },
                    { addresseeId: userId, status: 'ACCEPTED' }
                ]
            },
            select: { requesterId: true, addresseeId: true }
        });
        
        const connectionIds = new Set<string>();
        for (const conn of connections) {
            if (conn.requesterId !== userId) connectionIds.add(conn.requesterId);
            if (conn.addresseeId !== userId) connectionIds.add(conn.addresseeId);
        }
        
        // Always include own stories
        connectionIds.add(userId);
        
        // Group stories by user
        const storyGroups: Array<{
            userId: string;
            userName: string;
            userAvatar?: string;
            stories: Array<{
                id: string;
                type: string;
                mediaUrl?: string;
                text?: string;
                backgroundColor?: string;
                duration: number;
                createdAt: Date;
                expiresAt: Date;
                isViewed: boolean;
                viewCount: number;
                reactionCount: number;
            }>;
            hasUnviewed: boolean;
            latestAt: Date;
        }> = [];
        
        const userGroupMap = new Map<string, typeof storyGroups[0]>();
        
        for (const [storyId, story] of storiesStore.entries()) {
            // Skip expired stories
            if (story.expiresAt < now && !story.isHighlight) continue;
            
            // Check if user can see this story
            if (!connectionIds.has(story.authorId)) continue;
            
            // Check visibility
            if (story.visibility === 'private' && story.authorId !== userId) continue;
            if (story.visibility === 'connections' && !connectionIds.has(story.authorId)) continue;
            
            const isViewed = story.viewerIds.has(userId);
            
            if (!userGroupMap.has(story.authorId)) {
                userGroupMap.set(story.authorId, {
                    userId: story.authorId,
                    userName: story.authorName,
                    userAvatar: story.authorAvatar,
                    stories: [],
                    hasUnviewed: false,
                    latestAt: story.createdAt
                });
            }
            
            const group = userGroupMap.get(story.authorId)!;
            group.stories.push({
                id: story.id,
                type: story.type,
                mediaUrl: story.mediaUrl,
                text: story.text,
                backgroundColor: story.backgroundColor,
                duration: story.duration,
                createdAt: story.createdAt,
                expiresAt: story.expiresAt,
                isViewed,
                viewCount: story.viewCount,
                reactionCount: story.reactions.size
            });
            
            if (!isViewed) group.hasUnviewed = true;
            if (story.createdAt > group.latestAt) group.latestAt = story.createdAt;
        }
        
        // Convert to array and sort
        const groups = Array.from(userGroupMap.values());
        
        // Sort: unviewed first, then by latest story time
        groups.sort((a, b) => {
            if (a.hasUnviewed && !b.hasUnviewed) return -1;
            if (!a.hasUnviewed && b.hasUnviewed) return 1;
            return b.latestAt.getTime() - a.latestAt.getTime();
        });
        
        // Sort stories within each group by creation time
        for (const group of groups) {
            group.stories.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
        
        res.json({
            ok: true,
            storyGroups: groups,
            totalUsers: groups.length,
            totalStories: groups.reduce((sum, g) => sum + g.stories.length, 0)
        });
    } catch (error) {
        console.error('Error getting stories feed:', error);
        res.status(500).json({ error: 'Failed to get stories feed' });
    }
});

/**
 * GET /social-stories/user/:userId - Get a specific user's stories
 */
router.get('/user/:userId', authenticateJWT, async (req, res) => {
    try {
        const viewerId = req.user.id;
        const { userId: targetUserId } = req.params;
        const now = new Date();
        
        // Check if viewer can see target's stories
        if (viewerId !== targetUserId) {
            const connection = await prisma.userConnection.findFirst({
                where: {
                    OR: [
                        { requesterId: viewerId, addresseeId: targetUserId, status: 'ACCEPTED' },
                        { requesterId: targetUserId, addresseeId: viewerId, status: 'ACCEPTED' }
                    ]
                }
            });
            
            // For non-connections, only show public stories
            if (!connection) {
                const publicStories = [];
                for (const [storyId, story] of storiesStore.entries()) {
                    if (story.authorId === targetUserId && 
                        story.expiresAt > now && 
                        story.visibility === 'public') {
                        publicStories.push({
                            id: story.id,
                            type: story.type,
                            mediaUrl: story.mediaUrl,
                            text: story.text,
                            backgroundColor: story.backgroundColor,
                            duration: story.duration,
                            createdAt: story.createdAt,
                            expiresAt: story.expiresAt
                        });
                    }
                }
                
                return void res.json({
                    ok: true,
                    stories: publicStories,
                    isConnection: false
                });
            }
        }
        
        // Get user's active stories
        const stories = [];
        for (const [storyId, story] of storiesStore.entries()) {
            if (story.authorId !== targetUserId) continue;
            if (story.expiresAt < now && !story.isHighlight) continue;
            if (story.visibility === 'private' && viewerId !== targetUserId) continue;
            
            stories.push({
                id: story.id,
                type: story.type,
                mediaUrl: story.mediaUrl,
                text: story.text,
                backgroundColor: story.backgroundColor,
                fontStyle: story.fontStyle,
                duration: story.duration,
                createdAt: story.createdAt,
                expiresAt: story.expiresAt,
                isViewed: story.viewerIds.has(viewerId),
                isHighlight: story.isHighlight,
                highlightName: story.highlightName,
                // Only show analytics to the author
                ...(viewerId === targetUserId ? {
                    viewCount: story.viewCount,
                    reactionCount: story.reactions.size,
                    viewers: Array.from(story.viewerIds)
                } : {})
            });
        }
        
        // Sort by creation time
        stories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        res.json({
            ok: true,
            stories,
            isConnection: true,
            isOwnProfile: viewerId === targetUserId
        });
    } catch (error) {
        console.error('Error getting user stories:', error);
        res.status(500).json({ error: 'Failed to get user stories' });
    }
});

/**
 * POST /social-stories/:storyId/view - Mark a story as viewed
 */
router.post('/:storyId/view', authenticateJWT, async (req, res) => {
    try {
        const viewerId = req.user.id;
        const { storyId } = req.params;
        
        const story = storiesStore.get(storyId);
        
        if (!story) {
            return void res.status(404).json({ error: 'Story not found' });
        }
        
        // Check if already expired
        if (story.expiresAt < new Date() && !story.isHighlight) {
            return void res.status(410).json({ error: 'Story has expired' });
        }
        
        // Mark as viewed (don't count author's own views)
        if (viewerId !== story.authorId && !story.viewerIds.has(viewerId)) {
            story.viewerIds.add(viewerId);
            story.viewCount++;
        }
        
        res.json({
            ok: true,
            viewCount: story.viewCount
        });
    } catch (error) {
        console.error('Error marking story as viewed:', error);
        res.status(500).json({ error: 'Failed to mark story as viewed' });
    }
});

/**
 * POST /social-stories/:storyId/react - React to a story
 */
router.post('/:storyId/react', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { storyId } = req.params;
        const { reaction } = req.body; // emoji like '❤️', '😂', '😮', '😢', '👏'
        
        const story = storiesStore.get(storyId);
        
        if (!story) {
            return void res.status(404).json({ error: 'Story not found' });
        }
        
        if (story.expiresAt < new Date() && !story.isHighlight) {
            return void res.status(410).json({ error: 'Story has expired' });
        }
        
        // Valid reactions
        const validReactions = ['❤️', '😂', '😮', '😢', '👏', '🔥', '💯'];
        if (!validReactions.includes(reaction)) {
            return void res.status(400).json({ error: 'Invalid reaction' });
        }
        
        // Toggle reaction
        if (story.reactions.get(userId) === reaction) {
            story.reactions.delete(userId);
        } else {
            story.reactions.set(userId, reaction);
        }
        
        res.json({
            ok: true,
            reactionCount: story.reactions.size,
            yourReaction: story.reactions.get(userId) || null
        });
    } catch (error) {
        console.error('Error reacting to story:', error);
        res.status(500).json({ error: 'Failed to react to story' });
    }
});

/**
 * DELETE /social-stories/:storyId - Delete a story
 */
router.delete('/:storyId', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { storyId } = req.params;
        
        const story = storiesStore.get(storyId);
        
        if (!story) {
            return void res.status(404).json({ error: 'Story not found' });
        }
        
        if (story.authorId !== userId) {
            return void res.status(403).json({ error: 'Not authorized to delete this story' });
        }
        
        // Remove from user's stories list
        const userStoryIds = userStories.get(userId);
        if (userStoryIds) {
            const index = userStoryIds.indexOf(storyId);
            if (index > -1) {
                userStoryIds.splice(index, 1);
            }
        }
        
        // Remove from store
        storiesStore.delete(storyId);
        
        res.json({ ok: true, message: 'Story deleted' });
    } catch (error) {
        console.error('Error deleting story:', error);
        res.status(500).json({ error: 'Failed to delete story' });
    }
});

/**
 * POST /social-stories/:storyId/highlight - Save story to highlights
 */
router.post('/:storyId/highlight', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { storyId } = req.params;
        const { highlightName } = req.body;
        
        const story = storiesStore.get(storyId);
        
        if (!story) {
            return void res.status(404).json({ error: 'Story not found' });
        }
        
        if (story.authorId !== userId) {
            return void res.status(403).json({ error: 'Not authorized to highlight this story' });
        }
        
        // Mark as highlight (won't expire)
        story.isHighlight = true;
        story.highlightName = highlightName || 'Highlights';
        
        res.json({
            ok: true,
            message: 'Story saved to highlights',
            highlightName: story.highlightName
        });
    } catch (error) {
        console.error('Error highlighting story:', error);
        res.status(500).json({ error: 'Failed to highlight story' });
    }
});

/**
 * GET /social-stories/:storyId/viewers - Get story viewers (author only)
 */
router.get('/:storyId/viewers', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { storyId } = req.params;
        
        const story = storiesStore.get(storyId);
        
        if (!story) {
            return void res.status(404).json({ error: 'Story not found' });
        }
        
        if (story.authorId !== userId) {
            return void res.status(403).json({ error: 'Only the author can view story analytics' });
        }
        
        // Get viewer details
        const viewerIds = Array.from(story.viewerIds);
        const viewers = await prisma.user.findMany({
            where: { id: { in: viewerIds } },
            select: {
                id: true,
                name: true,
                avatarUrl: true
            }
        });
        
        // Add reaction info
        const viewersWithReactions = viewers.map(v => ({
            ...v,
            reaction: story.reactions.get(v.id) || null
        }));
        
        res.json({
            ok: true,
            viewCount: story.viewCount,
            viewers: viewersWithReactions,
            reactions: Object.fromEntries(story.reactions)
        });
    } catch (error) {
        console.error('Error getting story viewers:', error);
        res.status(500).json({ error: 'Failed to get story viewers' });
    }
});

/**
 * GET /social-stories/highlights/:userId - Get user's story highlights
 */
router.get('/highlights/:userId', authenticateJWT, async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        
        const highlights: Array<{
            id: string;
            type: string;
            mediaUrl?: string;
            text?: string;
            highlightName: string;
            createdAt: Date;
        }> = [];
        
        for (const [storyId, story] of storiesStore.entries()) {
            if (story.authorId === targetUserId && story.isHighlight) {
                highlights.push({
                    id: story.id,
                    type: story.type,
                    mediaUrl: story.mediaUrl,
                    text: story.text,
                    highlightName: story.highlightName || 'Highlights',
                    createdAt: story.createdAt
                });
            }
        }
        
        // Group by highlight name
        const groupedHighlights = new Map<string, typeof highlights>();
        for (const h of highlights) {
            if (!groupedHighlights.has(h.highlightName)) {
                groupedHighlights.set(h.highlightName, []);
            }
            groupedHighlights.get(h.highlightName)!.push(h);
        }
        
        res.json({
            ok: true,
            highlights: Object.fromEntries(groupedHighlights)
        });
    } catch (error) {
        console.error('Error getting highlights:', error);
        res.status(500).json({ error: 'Failed to get highlights' });
    }
});

export default router;

