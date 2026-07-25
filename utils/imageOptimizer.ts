/**
 * Image Optimization Utility for hfl-soccer-app
 * Reduces image payload sizes from 2MB+ down to ~30-50KB using Supabase / CDN Image Transformation.
 */

export interface ImageOptimizationOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png' | 'origin';
}

/**
 * Returns an optimized image URL for Supabase storage or CDN assets.
 */
export const getOptimizedImageUrl = (
    url: string | null | undefined,
    options: ImageOptimizationOptions = {}
): string => {
    if (!url) return '';

    const { width = 200, height, quality = 80, format = 'webp' } = options;

    try {
        // Handle Supabase Storage Public URLs
        if (url.includes('supabase.co/storage/v1/object/public/')) {
            const renderUrl = url.replace(
                '/storage/v1/object/public/',
                '/storage/v1/render/image/public/'
            );
            const queryParams: string[] = [`width=${width}`, `quality=${quality}`];
            if (height) queryParams.push(`height=${height}`);
            if (format) queryParams.push(`format=${format}`);
            return `${renderUrl}?${queryParams.join('&')}`;
        }

        // Handle Unsplash / Cloudinary / Gravatar if any
        if (url.includes('images.unsplash.com')) {
            return `${url}&w=${width}&q=${quality}&auto=format`;
        }

        return url;
    } catch {
        return url || '';
    }
};
