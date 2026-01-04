import { useEffect } from 'react';

interface MetaTagsConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}

export const useMetaTags = (config: MetaTagsConfig) => {
  useEffect(() => {
    const { title, description, image, url, type = 'website' } = config;
    const fullTitle = title ? `${title} | Triviabees` : 'Triviabees - AI, Play, Win, Earn shop and connect';
    const baseUrl = window.location.origin;
    const fullUrl = url || window.location.href;
    const fullImage = image?.startsWith('http') ? image : `${baseUrl}${image || '/og-image.png'}`;

    // Update document title
    document.title = fullTitle;

    // Helper to set meta tag
    const setMetaTag = (selector: string, content: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        if (selector.startsWith('[property=')) {
          element.setAttribute('property', selector.match(/\[property="(.+?)"\]/)?.[1] || '');
        } else if (selector.startsWith('[name=')) {
          element.setAttribute('name', selector.match(/\[name="(.+?)"\]/)?.[1] || '');
        }
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Open Graph tags
    setMetaTag('[property="og:title"]', fullTitle);
    setMetaTag('[property="og:description"]', description);
    setMetaTag('[property="og:image"]', fullImage);
    setMetaTag('[property="og:url"]', fullUrl);
    setMetaTag('[property="og:type"]', type);

    // Twitter tags
    setMetaTag('[name="twitter:title"]', fullTitle);
    setMetaTag('[name="twitter:description"]', description);
    setMetaTag('[name="twitter:image"]', fullImage);
    setMetaTag('[name="twitter:card"]', 'summary_large_image');

    // Standard description
    setMetaTag('[name="description"]', description);

    // Cleanup - restore defaults
    return () => {
      document.title = 'Triviabees - AI, Play, Win, Earn shop and connect';
    };
  }, [config.title, config.description, config.image, config.url, config.type]);
};

export default useMetaTags;
