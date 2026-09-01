import * as FileSystem from 'expo-file-system';

/**
 * Cache remote video files to local device disk storage to eliminate duplicate egress traffic
 */
export async function getCachedVideoUri(remoteUri: string): Promise<string> {
  if (!remoteUri || typeof remoteUri !== 'string' || !remoteUri.startsWith('http')) {
    return remoteUri;
  }

  try {
    // Extract sanitized file name from URL
    const urlParts = remoteUri.split('/');
    const fileName = urlParts[urlParts.length - 1]?.split('?')[0] || 'cached_replay.mp4';
    const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
    const cacheFileUri = `${cacheDir}video_replays_${fileName}`;

    // Check if video file already exists on local disk
    const fileInfo = await (FileSystem as any).getInfoAsync(cacheFileUri);
    if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
      console.log('⚡ [VIDEO CACHE HIT] Playing from local disk (0 MB Egress):', cacheFileUri);
      return cacheFileUri;
    }

    // Kesh mavjud emas — video ENDI to'liq yuklab bo'lguncha KUTILMAYDI (avval
    // shunday edi va katta videolarda ochilish juda sekin/qotib qoladigan
    // bo'lardi). Buning o'rniga darhol REMOTE manzildan streaming tarzida ijro
    // etiladi (expo-av o'zi progressiv HTTP buferlashni boshqaradi), keshga
    // yuklab olish esa FON rejimida (await qilinmasdan) davom etadi — keyingi
    // safar shu video 0 MB trafik bilan lokal diskdan ijro etiladi.
    console.log('📥 [VIDEO CACHE MISS] Streaming from remote, caching in background:', remoteUri);
    FileSystem.downloadAsync(remoteUri, cacheFileUri).catch((err) => {
      console.warn('Background video cache download failed:', err);
    });
    return remoteUri;
  } catch (err) {
    console.warn('Video cache helper exception, fallback to remote:', err);
  }

  return remoteUri;
}
