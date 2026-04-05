'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, MapPin, Clock, Users, Share2, Heart, 
  ArrowLeft, Crown, Sparkles, Gem, ChevronRight,
  Video, MessageCircle, Globe, CheckCircle, Bell, Loader2
} from 'lucide-react';

const API_URL = API_BASE;

// Fallback mock event data
const mockEvent = {
  title: 'First Nations Career Fair 2025',
  description: `Join us for the largest Indigenous career fair in Australia. Connect with over 50 employers committed to Indigenous hiring.

This annual event brings together Australia's most inclusive employers with talented First Nations job seekers. Whether you're looking for your first job, a career change, or executive opportunities, this is the event for you.

What to expect:
• Meet recruiters from top companies face-to-face
• On-the-spot interviews available
• Resume review stations
• Professional headshot booth
• Networking opportunities
• Cultural performances
• Free lunch and refreshments`,
  date: '2025-02-15',
  time: '9:00 AM - 4:00 PM',
  location: 'Sydney Convention Centre',
  address: '14 Darling Dr, Sydney NSW 2000',
  type: 'In Person',
  category: 'Career',
  attendees: 245,
  capacity: 500,
  organizer: {
    name: 'Ngurra Pathways',
    avatar: null,
    verified: true
  },
  isFeatured: true,
  isVirtual: false,
  virtualLink: null,
  agenda: [
    { time: '9:00 AM', title: 'Doors Open & Registration' },
    { time: '9:30 AM', title: 'Welcome to Country & Opening Ceremony' },
    { time: '10:00 AM', title: 'Career Fair Begins' },
    { time: '12:00 PM', title: 'Lunch Break & Networking' },
    { time: '1:00 PM', title: 'Panel: Thriving in Corporate Australia' },
    { time: '2:30 PM', title: 'Resume Workshops' },
    { time: '4:00 PM', title: 'Closing Remarks' }
  ]
};

export default function EventDetailPage({ params }) {
  const [isAttending, setIsAttending] = useState(false);
  const [isReminded, setIsReminded] = useState(false);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const organizerProfileHref = event?.organizer?.id ? `/profile/${event.organizer.id}` : null;

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/events/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch event');
        }
        
        const data = await response.json();
        
        // API returns event in data.event or directly
        const eventData = data.event || data;
        
        // Normalize the event data to match expected structure
        setEvent({
          id: eventData.id || params.id,
          title: eventData.title || eventData.name || mockEvent.title,
          description: eventData.description || mockEvent.description,
          date: eventData.date || eventData.startDate || mockEvent.date,
          time: eventData.time || (eventData.startTime && eventData.endTime ? 
            `${eventData.startTime} - ${eventData.endTime}` : mockEvent.time),
          location: eventData.location || eventData.venue || mockEvent.location,
          address: eventData.address || mockEvent.address,
          type: eventData.type || (eventData.isVirtual ? 'Virtual' : 'In Person'),
          category: eventData.category || mockEvent.category,
          attendees: eventData.attendees || eventData._count?.attendees || mockEvent.attendees,
          capacity: eventData.capacity || eventData.maxAttendees || mockEvent.capacity,
          organizer: eventData.organizer || eventData.organization || mockEvent.organizer,
          isFeatured: eventData.isFeatured ?? mockEvent.isFeatured,
          isVirtual: eventData.isVirtual ?? mockEvent.isVirtual,
          virtualLink: eventData.virtualLink || eventData.meetingLink || mockEvent.virtualLink,
          agenda: eventData.agenda || mockEvent.agenda,
          imageUrl: eventData.imageUrl || eventData.bannerImage || null
        });
        
        // Check if user is already attending (would need auth)
        if (eventData.isAttending !== undefined) {
          setIsAttending(eventData.isAttending);
        }
        if (eventData.hasReminder !== undefined) {
          setIsReminded(eventData.hasReminder);
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError(err.message);
        // Fallback to mock data
        setEvent({ ...mockEvent, id: params.id });
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [params.id]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen py-12 px-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#FFD700' }} />
          <p style={{ color: 'rgba(248, 246, 255, 0.7)' }}>Loading event...</p>
        </div>
      </div>
    );
  }

  // Error state (but still show mock data)
  if (!event) {
    return (
      <div className="min-h-screen py-12 px-6 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(255, 215, 0, 0.4)' }} />
          <p className="text-lg mb-2" style={{ color: 'rgba(248, 246, 255, 0.9)' }}>Event not found</p>
          <Link 
            href="/events"
            className="inline-flex items-center gap-2 transition-all duration-300"
            style={{ color: '#FFD700' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events</span>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-AU', options);
  };

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/events"
          className="inline-flex items-center gap-2 mb-8 transition-all duration-300"
          style={{ color: 'rgba(248, 246, 255, 0.7)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events</span>
        </Link>

        {/* Event Header */}
        <div 
          className="rounded-2xl overflow-hidden mb-8"
          style={{ 
            background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
            border: '1px solid rgba(255, 215, 0, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Hero Image */}
          <div 
            className="h-48 md:h-64 flex items-center justify-center relative"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(80, 200, 120, 0.15), rgba(183, 110, 121, 0.1))'
            }}
          >
            <Calendar className="w-24 h-24" style={{ color: 'rgba(255, 215, 0, 0.4)' }} />
            {event.isFeatured && (
              <div 
                className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(183, 110, 121, 0.2))',
                  border: '1px solid rgba(255, 215, 0, 0.4)'
                }}
              >
                <Crown className="w-4 h-4" style={{ color: '#FFD700' }} />
                <span className="text-sm font-medium" style={{ color: '#FFD700' }}>Featured Event</span>
              </div>
            )}
          </div>

          {/* Event Info */}
          <div className="p-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span 
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  background: 'rgba(255, 215, 0, 0.2)',
                  color: '#FFD700',
                  border: '1px solid rgba(255, 215, 0, 0.3)'
                }}
              >
                {event.type}
              </span>
              <span 
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  background: 'rgba(183, 110, 121, 0.2)',
                  color: '#B76E79',
                  border: '1px solid rgba(183, 110, 121, 0.3)'
                }}
              >
                {event.category}
              </span>
            </div>

            <h1 
              className="text-2xl md:text-3xl font-bold mb-6"
              style={{ 
                background: 'linear-gradient(135deg, #FFD700, #B76E79)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {event.title}
            </h1>

            {/* Key Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ background: 'rgba(255, 215, 0, 0.15)' }}
                  >
                    <Calendar className="w-5 h-5" style={{ color: '#FFD700' }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'rgba(248, 246, 255, 0.5)' }}>Date</p>
                    <p className="font-medium" style={{ color: 'rgba(248, 246, 255, 0.9)' }}>{formatDate(event.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ background: 'rgba(255, 215, 0, 0.15)' }}
                  >
                    <Clock className="w-5 h-5" style={{ color: '#FFD700' }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'rgba(248, 246, 255, 0.5)' }}>Time</p>
                    <p className="font-medium" style={{ color: 'rgba(248, 246, 255, 0.9)' }}>{event.time}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ background: 'rgba(255, 215, 0, 0.15)' }}
                  >
                    <MapPin className="w-5 h-5" style={{ color: '#FFD700' }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'rgba(248, 246, 255, 0.5)' }}>Location</p>
                    <p className="font-medium" style={{ color: 'rgba(248, 246, 255, 0.9)' }}>{event.location}</p>
                    <p className="text-sm" style={{ color: 'rgba(248, 246, 255, 0.5)' }}>{event.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ background: 'rgba(255, 215, 0, 0.15)' }}
                  >
                    <Users className="w-5 h-5" style={{ color: '#FFD700' }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'rgba(248, 246, 255, 0.5)' }}>Attendees</p>
                    <p className="font-medium" style={{ color: 'rgba(248, 246, 255, 0.9)' }}>{event.attendees} / {event.capacity} spots filled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setIsAttending(!isAttending)}
                className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300"
                style={{ 
                  background: isAttending 
                    ? 'linear-gradient(135deg, rgba(80, 200, 120, 0.2), rgba(80, 200, 120, 0.1))'
                    : 'linear-gradient(135deg, #C41E3A, #E85B8A)',
                  color: isAttending ? '#50C878' : 'white',
                  border: isAttending ? '2px solid #50C878' : '2px solid #FFD700',
                  boxShadow: isAttending ? 'none' : '0 4px 20px rgba(196, 30, 58, 0.35)'
                }}
              >
                {isAttending ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    I'm Attending
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Register Now
                  </>
                )}
              </button>
              <button
                onClick={() => setIsReminded(!isReminded)}
                className="flex items-center gap-2 px-5 py-3 rounded-full font-medium transition-all duration-300"
                style={{ 
                  background: isReminded ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                  border: '2px solid rgba(255, 215, 0, 0.3)',
                  color: isReminded ? '#FFD700' : 'rgba(248, 246, 255, 0.8)'
                }}
              >
                <Bell className="w-5 h-5" />
                {isReminded ? 'Reminder Set' : 'Set Reminder'}
              </button>
              <button
                className="flex items-center gap-2 px-5 py-3 rounded-full font-medium transition-all duration-300"
                style={{ 
                  border: '2px solid rgba(255, 215, 0, 0.3)',
                  color: 'rgba(248, 246, 255, 0.8)'
                }}
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Description & Agenda */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* About */}
          <div 
            className="lg:col-span-2 p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: '#FFD700' }}>About This Event</h2>
            <div 
              className="whitespace-pre-line text-base leading-relaxed"
              style={{ color: 'rgba(248, 246, 255, 0.8)' }}
            >
              {event.description}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Organizer */}
            <div 
              className="p-5 rounded-2xl"
              style={{ 
                background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
                border: '1px solid rgba(255, 215, 0, 0.15)'
              }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'rgba(248, 246, 255, 0.6)' }}>ORGANIZER</h3>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(183, 110, 121, 0.2))',
                    border: '2px solid rgba(255, 215, 0, 0.3)'
                  }}
                >
                  <Crown className="w-6 h-6" style={{ color: '#FFD700' }} />
                </div>
                <div>
                  <p className="font-semibold flex items-center gap-1" style={{ color: 'rgba(248, 246, 255, 0.95)' }}>
                    {event.organizer.name}
                    {event.organizer.verified && (
                      <CheckCircle className="w-4 h-4" style={{ color: '#50C878' }} />
                    )}
                  </p>
                  {organizerProfileHref ? (
                    <Link href={organizerProfileHref} className="text-sm" style={{ color: '#FFD700' }}>
                      View Profile
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Agenda */}
            <div 
              className="p-5 rounded-2xl"
              style={{ 
                background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
                border: '1px solid rgba(255, 215, 0, 0.15)'
              }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'rgba(248, 246, 255, 0.6)' }}>AGENDA</h3>
              <div className="space-y-3">
                {event.agenda.map((item, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="text-sm font-medium whitespace-nowrap" style={{ color: '#FFD700' }}>
                      {item.time}
                    </span>
                    <span className="text-sm" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Decorative gem */}
        <div className="flex justify-center mt-12">
          <Gem className="w-8 h-8" style={{ color: 'rgba(255, 215, 0, 0.3)' }} />
        </div>
      </div>
    </div>
  );
}
