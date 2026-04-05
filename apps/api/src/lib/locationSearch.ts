// @ts-nocheck
'use strict';

/**
 * Location-Based Search
 * Step 37: Geo-point indexing and distance filtering
 * 
 * Provides:
 * - Geocoding addresses to coordinates
 * - Distance-based job filtering
 * - Location autocomplete for Australian cities
 * - Remote work filtering
 * - Map view data formatting
 */

const logger = require('./logger');
const redisCache = require('./redisCache');

// Australian states and major cities with coordinates
const AUSTRALIAN_LOCATIONS = {
  // State capitals
  'sydney': { lat: -33.8688, lng: 151.2093, state: 'NSW', type: 'city' },
  'melbourne': { lat: -37.8136, lng: 144.9631, state: 'VIC', type: 'city' },
  'brisbane': { lat: -27.4698, lng: 153.0251, state: 'QLD', type: 'city' },
  'perth': { lat: -31.9505, lng: 115.8605, state: 'WA', type: 'city' },
  'adelaide': { lat: -34.9285, lng: 138.6007, state: 'SA', type: 'city' },
  'hobart': { lat: -42.8821, lng: 147.3272, state: 'TAS', type: 'city' },
  'darwin': { lat: -12.4634, lng: 130.8456, state: 'NT', type: 'city' },
  'canberra': { lat: -35.2809, lng: 149.1300, state: 'ACT', type: 'city' },
  
  // Major regional centers
  'newcastle': { lat: -32.9283, lng: 151.7817, state: 'NSW', type: 'city' },
  'wollongong': { lat: -34.4278, lng: 150.8931, state: 'NSW', type: 'city' },
  'gold coast': { lat: -28.0167, lng: 153.4000, state: 'QLD', type: 'city' },
  'sunshine coast': { lat: -26.6500, lng: 153.0667, state: 'QLD', type: 'city' },
  'geelong': { lat: -38.1499, lng: 144.3617, state: 'VIC', type: 'city' },
  'townsville': { lat: -19.2590, lng: 146.8169, state: 'QLD', type: 'city' },
  'cairns': { lat: -16.9186, lng: 145.7781, state: 'QLD', type: 'city' },
  'toowoomba': { lat: -27.5598, lng: 151.9507, state: 'QLD', type: 'city' },
  'ballarat': { lat: -37.5622, lng: 143.8503, state: 'VIC', type: 'city' },
  'bendigo': { lat: -36.7570, lng: 144.2794, state: 'VIC', type: 'city' },
  'albury': { lat: -36.0737, lng: 146.9135, state: 'NSW', type: 'city' },
  'launceston': { lat: -41.4332, lng: 147.1441, state: 'TAS', type: 'city' },
  'alice springs': { lat: -23.6980, lng: 133.8807, state: 'NT', type: 'city' },
  'rockhampton': { lat: -23.3791, lng: 150.5100, state: 'QLD', type: 'city' },
  'bunbury': { lat: -33.3271, lng: 115.6413, state: 'WA', type: 'city' },
  
  // Indigenous community regions
  'arnhem land': { lat: -12.5000, lng: 135.0000, state: 'NT', type: 'region' },
  'kimberley': { lat: -17.5000, lng: 125.0000, state: 'WA', type: 'region' },
  'cape york': { lat: -14.0000, lng: 143.0000, state: 'QLD', type: 'region' },
  'central australia': { lat: -24.0000, lng: 133.0000, state: 'NT', type: 'region' },
  'pilbara': { lat: -22.0000, lng: 118.0000, state: 'WA', type: 'region' },
  'torres strait': { lat: -10.5000, lng: 142.0000, state: 'QLD', type: 'region' },
  
  // States
  'new south wales': { lat: -32.0, lng: 147.0, state: 'NSW', type: 'state' },
  'nsw': { lat: -32.0, lng: 147.0, state: 'NSW', type: 'state' },
  'victoria': { lat: -37.0, lng: 144.0, state: 'VIC', type: 'state' },
  'vic': { lat: -37.0, lng: 144.0, state: 'VIC', type: 'state' },
  'queensland': { lat: -22.0, lng: 145.0, state: 'QLD', type: 'state' },
  'qld': { lat: -22.0, lng: 145.0, state: 'QLD', type: 'state' },
  'western australia': { lat: -25.0, lng: 121.0, state: 'WA', type: 'state' },
  'wa': { lat: -25.0, lng: 121.0, state: 'WA', type: 'state' },
  'south australia': { lat: -30.0, lng: 136.0, state: 'SA', type: 'state' },
  'sa': { lat: -30.0, lng: 136.0, state: 'SA', type: 'state' },
  'tasmania': { lat: -42.0, lng: 147.0, state: 'TAS', type: 'state' },
  'tas': { lat: -42.0, lng: 147.0, state: 'TAS', type: 'state' },
  'northern territory': { lat: -19.0, lng: 133.0, state: 'NT', type: 'state' },
  'nt': { lat: -19.0, lng: 133.0, state: 'NT', type: 'state' },
  'australian capital territory': { lat: -35.3, lng: 149.1, state: 'ACT', type: 'state' },
  'act': { lat: -35.3, lng: 149.1, state: 'ACT', type: 'state' }
};

// Remote work keywords
const REMOTE_KEYWORDS = [
  'remote', 'work from home', 'wfh', 'hybrid', 'flexible location',
  'anywhere', 'distributed', 'home-based', 'telecommute', 'virtual'
];

/**
 * Geocode a location string to coordinates
 * @param {string} location - Location string (city, state, address)
 * @returns {object|null} { lat, lng, state, type }
 */
async function geocode(location) {
  if (!location) return null;

  const normalized = location.toLowerCase().trim();
  
  // Check cache
  const cacheKey = `geo:${normalized}`;
  const cached = await redisCache.get(cacheKey);
  if (cached) return cached;

  // Check our built-in database first
  const knownLocation = AUSTRALIAN_LOCATIONS[normalized];
  if (knownLocation) {
    await redisCache.set(cacheKey, knownLocation, 86400 * 30); // Cache 30 days
    return knownLocation;
  }

  // Try partial match
  for (const [key, value] of Object.entries(AUSTRALIAN_LOCATIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      await redisCache.set(cacheKey, value, 86400 * 30);
      return value;
    }
  }

  // Try external geocoding service if configured
  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      const result = await googleGeocode(location);
      if (result) {
        await redisCache.set(cacheKey, result, 86400 * 30);
        return result;
      }
    } catch (error) {
      logger.warn('Google geocoding failed', { location, error: error.message });
    }
  }

  // Return null if no match found
  return null;
}

/**
 * Google Maps Geocoding API
 */
async function googleGeocode(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const encodedAddress = encodeURIComponent(`${address}, Australia`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const { lat, lng } = result.geometry.location;
      
      // Extract state from address components
      let state = null;
      for (const component of result.address_components) {
        if (component.types.includes('administrative_area_level_1')) {
          state = component.short_name;
          break;
        }
      }

      return { lat, lng, state, type: 'address', formatted: result.formatted_address };
    }
  } catch (error) {
    logger.error('Geocoding error', { address, error: error.message });
  }

  return null;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {object} point1 - { lat, lng }
 * @param {object} point2 - { lat, lng }
 * @returns {number} Distance in kilometers
 */
function calculateDistance(point1, point2) {
  if (!point1?.lat || !point1?.lng || !point2?.lat || !point2?.lng) {
    return null;
  }

  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Filter jobs by distance from a location
 * @param {object[]} jobs - Array of jobs with location field
 * @param {object} origin - { lat, lng } or location string
 * @param {number} maxDistanceKm - Maximum distance in kilometers
 */
async function filterByDistance(jobs, origin, maxDistanceKm = 50) {
  // Geocode origin if it's a string
  let originCoords = origin;
  if (typeof origin === 'string') {
    originCoords = await geocode(origin);
    if (!originCoords) {
      return { jobs, error: 'Could not geocode origin location' };
    }
  }

  const filtered = await Promise.all(jobs.map(async (job) => {
    // Check if remote
    if (isRemoteJob(job)) {
      return { ...job, distance: null, isRemote: true };
    }

    // Geocode job location
    const jobCoords = await geocode(job.location);
    if (!jobCoords) {
      return null; // Exclude jobs we can't geocode
    }

    const distance = calculateDistance(originCoords, jobCoords);
    if (distance === null || distance > maxDistanceKm) {
      return null;
    }

    return { 
      ...job, 
      distance: Math.round(distance), 
      coordinates: { lat: jobCoords.lat, lng: jobCoords.lng }
    };
  }));

  return {
    jobs: filtered.filter(Boolean),
    origin: originCoords,
    maxDistance: maxDistanceKm
  };
}

/**
 * Check if a job is remote
 * @param {object} job - Job object
 */
function isRemoteJob(job) {
  if (job.isRemote) return true;
  
  const locationLower = (job.location || '').toLowerCase();
  return REMOTE_KEYWORDS.some(kw => locationLower.includes(kw));
}

/**
 * Location autocomplete
 * @param {string} prefix - User input prefix
 * @param {number} limit - Max results
 */
async function autocomplete(prefix, limit = 10) {
  if (!prefix || prefix.length < 2) return [];

  const normalized = prefix.toLowerCase().trim();
  const matches = [];

  // Search in our location database
  for (const [name, data] of Object.entries(AUSTRALIAN_LOCATIONS)) {
    if (name.startsWith(normalized) || name.includes(normalized)) {
      matches.push({
        name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        state: data.state,
        type: data.type,
        coordinates: { lat: data.lat, lng: data.lng }
      });
    }
  }

  // Sort: prefer cities, then by name length
  matches.sort((a, b) => {
    if (a.type === 'city' && b.type !== 'city') return -1;
    if (b.type === 'city' && a.type !== 'city') return 1;
    return a.name.length - b.name.length;
  });

  return matches.slice(0, limit);
}

/**
 * Format jobs for map view
 * @param {object[]} jobs - Array of jobs with coordinates
 */
function formatForMapView(jobs) {
  const markers = [];
  const clusters = new Map(); // Group nearby jobs

  for (const job of jobs) {
    if (!job.coordinates && job.location) {
      // Skip jobs without coordinates
      continue;
    }

    if (job.isRemote) {
      // Remote jobs don't appear on map
      continue;
    }

    const coords = job.coordinates;
    if (!coords?.lat || !coords?.lng) continue;

    // Round coordinates for clustering (about 11km precision)
    const clusterKey = `${coords.lat.toFixed(1)},${coords.lng.toFixed(1)}`;
    
    if (!clusters.has(clusterKey)) {
      clusters.set(clusterKey, {
        lat: coords.lat,
        lng: coords.lng,
        jobs: []
      });
    }
    
    clusters.get(clusterKey).jobs.push({
      id: job.id,
      title: job.title,
      company: job.company || job.user?.companyProfile?.companyName,
      location: job.location
    });
  }

  // Convert clusters to markers
  for (const [key, cluster] of clusters.entries()) {
    markers.push({
      coordinates: { lat: cluster.lat, lng: cluster.lng },
      jobCount: cluster.jobs.length,
      jobs: cluster.jobs.slice(0, 5), // Preview first 5
      hasMore: cluster.jobs.length > 5
    });
  }

  return {
    markers,
    totalJobs: jobs.length,
    mappedJobs: markers.reduce((sum, m) => sum + m.jobCount, 0)
  };
}

/**
 * Get jobs within a bounding box (for map viewport)
 * @param {object} bounds - { north, south, east, west }
 */
async function getJobsInBounds(prisma, bounds) {
  // This would work better with PostGIS, but we can approximate with Prisma
  try {
    const jobs = await prisma.job.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        location: true,
        isRemote: true,
        user: {
          select: {
            companyProfile: { select: { companyName: true } }
          }
        }
      },
      take: 500
    });

    // Filter by geocoded coordinates
    const filtered = await Promise.all(jobs.map(async (job) => {
      if (isRemoteJob(job)) return null;
      
      const coords = await geocode(job.location);
      if (!coords) return null;
      
      if (
        coords.lat >= bounds.south &&
        coords.lat <= bounds.north &&
        coords.lng >= bounds.west &&
        coords.lng <= bounds.east
      ) {
        return { ...job, coordinates: coords };
      }
      
      return null;
    }));

    return filtered.filter(Boolean);
  } catch (error) {
    logger.error('Jobs in bounds error', { bounds, error: error.message });
    return [];
  }
}

/**
 * Get distance ranges for filtering
 */
function getDistanceOptions() {
  return [
    { value: 10, label: 'Within 10 km' },
    { value: 25, label: 'Within 25 km' },
    { value: 50, label: 'Within 50 km' },
    { value: 100, label: 'Within 100 km' },
    { value: 200, label: 'Within 200 km' },
    { value: null, label: 'Any distance' }
  ];
}

/**
 * Parse location from job posting
 * @param {string} rawLocation - Raw location string from job
 */
function parseLocation(rawLocation) {
  if (!rawLocation) return { type: 'unknown' };

  const lower = rawLocation.toLowerCase();

  // Check for remote
  if (REMOTE_KEYWORDS.some(kw => lower.includes(kw))) {
    return { type: 'remote', isRemote: true };
  }

  // Check for state abbreviations
  const stateMatch = lower.match(/\b(nsw|vic|qld|wa|sa|tas|nt|act)\b/);
  if (stateMatch) {
    const stateData = AUSTRALIAN_LOCATIONS[stateMatch[1]];
    return { 
      type: 'state', 
      state: stateData?.state,
      coordinates: stateData ? { lat: stateData.lat, lng: stateData.lng } : null
    };
  }

  // Try to find a city
  for (const [city, data] of Object.entries(AUSTRALIAN_LOCATIONS)) {
    if (data.type === 'city' && lower.includes(city)) {
      return {
        type: 'city',
        city: city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        state: data.state,
        coordinates: { lat: data.lat, lng: data.lng }
      };
    }
  }

  return { type: 'unknown', raw: rawLocation };
}
