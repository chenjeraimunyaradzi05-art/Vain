import { API_BASE } from '@/lib/apiBase';
import EventsClient from './EventsClient';

// Fallback mock events data
const MOCK_EVENTS = [
  {
    id: 1,
    title: 'First Nations Career Fair 2025',
    description: 'Join us for the largest Indigenous career fair in Australia. Connect with over 50 employers committed to Indigenous hiring.',
    date: '2025-02-15',
    time: '9:00 AM - 4:00 PM',
    location: 'Sydney Convention Centre',
    type: 'In Person',
    category: 'Career',
    attendees: 245,
    organizer: 'Ngurra Pathways',
    image: null,
    isFeatured: true
  },
  {
    id: 2,
    title: 'Women in Leadership Workshop',
    description: 'An empowering workshop for First Nations women exploring leadership roles. Learn from successful Indigenous leaders.',
    date: '2025-02-20',
    time: '10:00 AM - 2:00 PM',
    location: 'Online via Zoom',
    type: 'Virtual',
    category: 'Workshop',
    attendees: 89,
    organizer: 'Aboriginal Women Business Network',
    image: null,
    isFeatured: true
  },
  {
    id: 3,
    title: 'Resume Writing Masterclass',
    description: 'Learn how to craft a compelling resume that showcases your skills and cultural strengths.',
    date: '2025-02-22',
    time: '1:00 PM - 3:00 PM',
    location: 'Online',
    type: 'Virtual',
    category: 'Workshop',
    attendees: 56,
    organizer: 'Ngurra Pathways',
    image: null,
    isFeatured: false
  },
  {
    id: 4,
    title: 'Community Networking Night',
    description: 'A relaxed evening to connect with other First Nations professionals in your area.',
    date: '2025-02-28',
    time: '6:00 PM - 9:00 PM',
    location: 'Melbourne CBD',
    type: 'In Person',
    category: 'Networking',
    attendees: 78,
    organizer: 'Victorian Indigenous Chamber',
    image: null,
    isFeatured: false
  },
  {
    id: 5,
    title: 'Tech Industry Mentorship Info Session',
    description: 'Discover opportunities in tech and connect with mentors in the industry.',
    date: '2025-03-05',
    time: '11:00 AM - 12:30 PM',
    location: 'Online',
    type: 'Virtual',
    category: 'Mentorship',
    attendees: 42,
    organizer: 'Indigenous Tech Network',
    image: null,
    isFeatured: false
  },
  {
    id: 6,
    title: 'NAIDOC Week Celebrations',
    description: 'Join us for a week of cultural celebrations, workshops, and community gatherings.',
    date: '2025-07-06',
    time: 'All Week',
    location: 'Various Locations',
    type: 'Hybrid',
    category: 'Cultural',
    attendees: 512,
    organizer: 'NAIDOC Committee',
    image: null,
    isFeatured: true
  }
];

/**
 * Events Page (Server Component)
 * Pre-fetches events at request time for fast first paint.
 */
export default async function EventsPage() {
    let initialEvents = [];

    try {
        // Use 127.0.0.1 to avoid Windows IPv6 localhost issues
        const serverApiBase = String(API_BASE || '')
            .replace('http://localhost', 'http://127.0.0.1')
            .replace('https://localhost', 'https://127.0.0.1');

        const res = await fetch(`${serverApiBase}/events`, {
            cache: 'no-store',
        });

        if (res.ok) {
            const data = await res.json();
            const rawEvents = data.events || data || [];
            
            if (rawEvents.length > 0) {
                // Normalize API response to expected format
                initialEvents = rawEvents.map(event => ({
                    id: event.id,
                    title: event.title || event.name,
                    description: event.description || '',
                    date: event.date || event.startDate,
                    time: event.time || (event.startTime && event.endTime ? 
                        `${event.startTime} - ${event.endTime}` : ''),
                    location: event.location || event.venue || '',
                    type: event.type || (event.isVirtual ? 'Virtual' : 'In Person'),
                    category: event.category || 'General',
                    attendees: event.attendees || event._count?.attendees || 0,
                    organizer: typeof event.organizer === 'object' ? event.organizer.name : event.organizer,
                    image: event.imageUrl || event.bannerImage || null,
                    isFeatured: event.isFeatured || false
                }));
            }
        }
    } catch {
        // Fallback to mock events on any error
    }

    // Use mock events if API returned nothing
    if (initialEvents.length === 0) {
        initialEvents = MOCK_EVENTS;
    }

    return (
        <EventsClient
            initialEvents={initialEvents}
            hasPrefetched={initialEvents.length > 0}
        />
    );
}
