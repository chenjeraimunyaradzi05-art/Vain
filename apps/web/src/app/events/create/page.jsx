'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Calendar, MapPin, Clock, Image, ArrowLeft, 
  Crown, Sparkles, Gem, Video, Globe, Users,
  Plus, Minus, Upload, AlertCircle
} from 'lucide-react';

const eventCategories = [
  { id: 'career', label: 'Career Fair', icon: '💼' },
  { id: 'workshop', label: 'Workshop', icon: '📚' },
  { id: 'networking', label: 'Networking', icon: '🤝' },
  { id: 'mentorship', label: 'Mentorship', icon: '🌟' },
  { id: 'cultural', label: 'Cultural', icon: '🎨' },
  { id: 'webinar', label: 'Webinar', icon: '💻' }
];

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    eventType: 'in-person',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    virtualLink: '',
    capacity: '',
    isFree: true,
    price: '',
    coverImage: null
  });

  const [agendaItems, setAgendaItems] = useState([
    { time: '', title: '' }
  ]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addAgendaItem = () => {
    setAgendaItems([...agendaItems, { time: '', title: '' }]);
  };

  const removeAgendaItem = (index) => {
    if (agendaItems.length > 1) {
      setAgendaItems(agendaItems.filter((_, i) => i !== index));
    }
  };

  const updateAgendaItem = (index, field, value) => {
    const updated = [...agendaItems];
    updated[index][field] = value;
    setAgendaItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      router.push('/events');
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/events"
          className="inline-flex items-center gap-2 mb-8 transition-all duration-300"
          style={{ color: 'rgba(248, 246, 255, 0.7)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events</span>
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div 
            className="p-3 rounded-xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(80, 200, 120, 0.15))',
              border: '1px solid rgba(255, 215, 0, 0.3)'
            }}
          >
            <Calendar className="w-8 h-8" style={{ color: '#FFD700' }} />
          </div>
          <div>
            <h1 
              className="text-3xl font-bold"
              style={{ 
                background: 'linear-gradient(135deg, #FFD700, #B76E79)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Create Event
            </h1>
            <p style={{ color: 'rgba(248, 246, 255, 0.6)' }}>Bring the community together</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFD700' }}>Event Details</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. First Nations Career Fair 2025"
                  className="w-full p-4 rounded-xl transition-all duration-300"
                  style={{ 
                    background: 'rgba(26, 15, 46, 0.5)',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    color: 'rgba(248, 246, 255, 0.9)'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Tell people what your event is about..."
                  className="w-full p-4 rounded-xl transition-all duration-300 resize-none"
                  style={{ 
                    background: 'rgba(26, 15, 46, 0.5)',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    color: 'rgba(248, 246, 255, 0.9)'
                  }}
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Category *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {eventCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                      className="p-4 rounded-xl text-left transition-all duration-300"
                      style={{ 
                        background: formData.category === cat.id 
                          ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(80, 200, 120, 0.15))'
                          : 'rgba(26, 15, 46, 0.5)',
                        border: formData.category === cat.id 
                          ? '2px solid rgba(255, 215, 0, 0.5)'
                          : '1px solid rgba(255, 215, 0, 0.15)',
                        color: 'rgba(248, 246, 255, 0.9)'
                      }}
                    >
                      <span className="text-xl mb-1 block">{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Event Type & Location */}
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFD700' }}>Location</h2>
            
            <div className="space-y-6">
              {/* Event Type Toggle */}
              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Event Type *
                </label>
                <div className="flex gap-3">
                  {[
                    { id: 'in-person', label: 'In Person', icon: MapPin },
                    { id: 'virtual', label: 'Virtual', icon: Video },
                    { id: 'hybrid', label: 'Hybrid', icon: Globe }
                  ].map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, eventType: type.id }))}
                        className="flex-1 flex items-center justify-center gap-2 p-4 rounded-xl transition-all duration-300"
                        style={{ 
                          background: formData.eventType === type.id 
                            ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(80, 200, 120, 0.15))'
                            : 'rgba(26, 15, 46, 0.5)',
                          border: formData.eventType === type.id 
                            ? '2px solid rgba(255, 215, 0, 0.5)'
                            : '1px solid rgba(255, 215, 0, 0.15)',
                          color: formData.eventType === type.id ? '#FFD700' : 'rgba(248, 246, 255, 0.7)'
                        }}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Input */}
              {(formData.eventType === 'in-person' || formData.eventType === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                    Venue Address *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.4)' }} />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Enter venue address"
                      className="w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-300"
                      style={{ 
                        background: 'rgba(26, 15, 46, 0.5)',
                        border: '1px solid rgba(255, 215, 0, 0.2)',
                        color: 'rgba(248, 246, 255, 0.9)'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Virtual Link */}
              {(formData.eventType === 'virtual' || formData.eventType === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                    Virtual Meeting Link
                  </label>
                  <div className="relative">
                    <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.4)' }} />
                    <input
                      type="url"
                      name="virtualLink"
                      value={formData.virtualLink}
                      onChange={handleChange}
                      placeholder="e.g. https://zoom.us/j/..."
                      className="w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-300"
                      style={{ 
                        background: 'rgba(26, 15, 46, 0.5)',
                        border: '1px solid rgba(255, 215, 0, 0.2)',
                        color: 'rgba(248, 246, 255, 0.9)'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date & Time */}
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFD700' }}>Date & Time</h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full p-3 rounded-xl transition-all duration-300"
                  style={{ 
                    background: 'rgba(26, 15, 46, 0.5)',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    color: 'rgba(248, 246, 255, 0.9)'
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Start Time *
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                  className="w-full p-3 rounded-xl transition-all duration-300"
                  style={{ 
                    background: 'rgba(26, 15, 46, 0.5)',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    color: 'rgba(248, 246, 255, 0.9)'
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  End Time *
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                  className="w-full p-3 rounded-xl transition-all duration-300"
                  style={{ 
                    background: 'rgba(26, 15, 46, 0.5)',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    color: 'rgba(248, 246, 255, 0.9)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Agenda */}
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold" style={{ color: '#FFD700' }}>Agenda (Optional)</h2>
              <button
                type="button"
                onClick={addAgendaItem}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all duration-300"
                style={{ 
                  background: 'rgba(255, 215, 0, 0.15)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  color: '#FFD700'
                }}
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
            
            <div className="space-y-4">
              {agendaItems.map((item, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <input
                    type="time"
                    value={item.time}
                    onChange={(e) => updateAgendaItem(index, 'time', e.target.value)}
                    className="w-32 p-3 rounded-xl transition-all duration-300"
                    style={{ 
                      background: 'rgba(26, 15, 46, 0.5)',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      color: 'rgba(248, 246, 255, 0.9)'
                    }}
                  />
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateAgendaItem(index, 'title', e.target.value)}
                    placeholder="Agenda item title"
                    className="flex-1 p-3 rounded-xl transition-all duration-300"
                    style={{ 
                      background: 'rgba(26, 15, 46, 0.5)',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      color: 'rgba(248, 246, 255, 0.9)'
                    }}
                  />
                  {agendaItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAgendaItem(index)}
                      className="p-3 rounded-xl transition-all duration-300"
                      style={{ 
                        background: 'rgba(196, 30, 58, 0.2)',
                        border: '1px solid rgba(196, 30, 58, 0.3)',
                        color: '#C41E3A'
                      }}
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Capacity & Pricing */}
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.6), rgba(45, 27, 105, 0.4))',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFD700' }}>Capacity & Tickets</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                  Maximum Attendees
                </label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(248, 246, 255, 0.4)' }} />
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    placeholder="Leave blank for unlimited"
                    className="w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-300"
                    style={{ 
                      background: 'rgba(26, 15, 46, 0.5)',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      color: 'rgba(248, 246, 255, 0.9)'
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isFree"
                    checked={formData.isFree}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div 
                    className="w-11 h-6 rounded-full relative transition-all duration-300"
                    style={{ 
                      background: formData.isFree ? 'linear-gradient(135deg, #50C878, #FFD700)' : 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.3)'
                    }}
                  >
                    <div 
                      className="absolute top-[2px] left-[2px] w-5 h-5 rounded-full transition-all"
                      style={{ 
                        background: '#fff',
                        transform: formData.isFree ? 'translateX(20px)' : 'translateX(0)'
                      }}
                    />
                  </div>
                  <span style={{ color: 'rgba(248, 246, 255, 0.8)' }}>Free Event</span>
                </label>
              </div>

              {!formData.isFree && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(248, 246, 255, 0.8)' }}>
                    Ticket Price (AUD)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full p-3 rounded-xl transition-all duration-300"
                    style={{ 
                      background: 'rgba(26, 15, 46, 0.5)',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      color: 'rgba(248, 246, 255, 0.9)'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              href="/events"
              className="px-6 py-3 rounded-full font-medium transition-all duration-300"
              style={{ 
                border: '2px solid rgba(255, 215, 0, 0.3)',
                color: 'rgba(248, 246, 255, 0.8)'
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all duration-300"
              style={{ 
                background: 'linear-gradient(135deg, #C41E3A, #E85B8A)',
                color: 'white',
                border: '2px solid #FFD700',
                boxShadow: '0 4px 20px rgba(196, 30, 58, 0.35)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Event
                </>
              )}
            </button>
          </div>
        </form>

        {/* Decorative gem */}
        <div className="flex justify-center mt-12">
          <Gem className="w-8 h-8" style={{ color: 'rgba(255, 215, 0, 0.3)' }} />
        </div>
      </div>
    </div>
  );
}
