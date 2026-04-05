/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://ngurrapathways.life',
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  
  // Exclude private pages from sitemap
  exclude: [
    '/dashboard/*',
    '/settings/*',
    '/admin/*',
    '/api/*',
    '/profile/*',
    '/applications/*',
    '/messages/*',
    '/notifications/*',
  ],
  
  // Transform function for custom handling
  transform: async (config, path) => {
    // Set priority based on page type
    let priority = 0.7;
    let changefreq = 'weekly';
    
    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path.startsWith('/jobs')) {
      priority = 0.9;
      changefreq = 'daily';
    } else if (path.startsWith('/courses')) {
      priority = 0.8;
      changefreq = 'weekly';
    } else if (path.startsWith('/mentors')) {
      priority = 0.8;
      changefreq = 'weekly';
    } else if (path.startsWith('/about') || path.startsWith('/contact')) {
      priority = 0.6;
      changefreq = 'monthly';
    }
    
    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
  
  // Additional paths to include (dynamic routes)
  additionalPaths: async (config) => {
    const result = [];
    
    // Add static pages
    const staticPages = [
      '/about',
      '/contact',
      '/privacy',
      '/terms',
      '/accessibility',
      '/careers',
      '/for-employers',
      '/for-jobseekers',
      '/for-mentors',
      '/community',
      '/resources',
      '/events',
      '/success-stories',
    ];
    
    for (const page of staticPages) {
      result.push({
        loc: page,
        changefreq: 'monthly',
        priority: 0.6,
        lastmod: new Date().toISOString(),
      });
    }
    
    return result;
  },
  
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/admin/',
          '/profile/',
          '/_next/',
          '/static/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
      },
    ],
    additionalSitemaps: [
      // Add additional sitemaps if needed
      // 'https://ngurrapathways.com.au/jobs-sitemap.xml',
    ],
  },
};
