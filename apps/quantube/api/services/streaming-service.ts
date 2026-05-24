// ============================================================================
// QuantTube - Streaming Service
// Adaptive bitrate streaming, CDN management, quality selection
// ============================================================================

interface StreamInfo {
  url: string;
  quality: string;
  availableQualities: string[];
  cdnNode: string;
  expiresAt: string;
  bandwidth: number;
}

interface HLSManifest {
  version: number;
  targetDuration: number;
  mediaSequence: number;
  segments: ManifestSegment[];
  variants: ManifestVariant[];
}

interface ManifestSegment {
  uri: string;
  duration: number;
  sequence: number;
}

interface ManifestVariant {
  bandwidth: number;
  resolution: string;
  codecs: string;
  uri: string;
}

interface CDNNode {
  id: string;
  region: string;
  capacity: number;
  currentLoad: number;
  latency: number;
}

class StreamingService {
  private cdnNodes: CDNNode[] = [
    { id: 'cdn_us_east', region: 'us-east-1', capacity: 10000, currentLoad: 4500, latency: 15 },
    { id: 'cdn_us_west', region: 'us-west-2', capacity: 10000, currentLoad: 3200, latency: 25 },
    { id: 'cdn_eu_west', region: 'eu-west-1', capacity: 8000, currentLoad: 5100, latency: 45 },
    { id: 'cdn_asia', region: 'ap-southeast-1', capacity: 6000, currentLoad: 2800, latency: 80 },
    { id: 'cdn_sa', region: 'sa-east-1', capacity: 4000, currentLoad: 1500, latency: 120 },
  ];

  private qualityProfiles: Record<string, { width: number; height: number; bitrate: number; codec: string }> = {
    '360p': { width: 640, height: 360, bitrate: 800000, codec: 'avc1.42001E' },
    '480p': { width: 854, height: 480, bitrate: 1400000, codec: 'avc1.4D001F' },
    '720p': { width: 1280, height: 720, bitrate: 2800000, codec: 'avc1.4D0020' },
    '1080p': { width: 1920, height: 1080, bitrate: 5000000, codec: 'avc1.640028' },
    '1440p': { width: 2560, height: 1440, bitrate: 8000000, codec: 'avc1.640032' },
    '4k': { width: 3840, height: 2160, bitrate: 16000000, codec: 'avc1.640033' },
  };

  getStreamUrl(videoId: string, requestedQuality: string): StreamInfo {
    const bestNode = this.selectBestCDN();
    const quality = requestedQuality === 'auto' ? this.determineAdaptiveQuality(bestNode) : requestedQuality;
    const profile = this.qualityProfiles[quality] || this.qualityProfiles['720p'];

    return {
      url: `https://${bestNode.id}.cdn.quant.app/streams/${videoId}/${quality}/manifest.m3u8`,
      quality,
      availableQualities: Object.keys(this.qualityProfiles),
      cdnNode: bestNode.id,
      expiresAt: new Date(Date.now() + 4 * 3600000).toISOString(),
      bandwidth: profile.bitrate,
    };
  }

  generateManifest(videoId: string, duration: number): HLSManifest {
    const segmentDuration = 6;
    const segmentCount = Math.ceil(duration / segmentDuration);

    const segments: ManifestSegment[] = Array.from({ length: segmentCount }, (_, i) => ({
      uri: `/segments/${videoId}/seg_${i}.ts`,
      duration: i === segmentCount - 1 ? duration % segmentDuration || segmentDuration : segmentDuration,
      sequence: i,
    }));

    const variants: ManifestVariant[] = Object.entries(this.qualityProfiles).map(([name, profile]) => ({
      bandwidth: profile.bitrate,
      resolution: `${profile.width}x${profile.height}`,
      codecs: profile.codec,
      uri: `/streams/${videoId}/${name}/playlist.m3u8`,
    }));

    return {
      version: 3,
      targetDuration: segmentDuration,
      mediaSequence: 0,
      segments,
      variants,
    };
  }

  private selectBestCDN(): CDNNode {
    // Select CDN with lowest latency that has capacity
    const available = this.cdnNodes.filter(n => n.currentLoad < n.capacity * 0.9);
    if (available.length === 0) return this.cdnNodes[0];
    return available.sort((a, b) => {
      const scoreA = a.latency * 0.6 + (a.currentLoad / a.capacity) * 100 * 0.4;
      const scoreB = b.latency * 0.6 + (b.currentLoad / b.capacity) * 100 * 0.4;
      return scoreA - scoreB;
    })[0];
  }

  private determineAdaptiveQuality(node: CDNNode): string {
    // Adaptive quality based on CDN load and network conditions
    const loadFactor = node.currentLoad / node.capacity;
    if (loadFactor < 0.3) return '1080p';
    if (loadFactor < 0.6) return '720p';
    if (loadFactor < 0.8) return '480p';
    return '360p';
  }

  getSegment(videoId: string, quality: string, segmentIndex: number): { url: string; size: number; duration: number } {
    const profile = this.qualityProfiles[quality] || this.qualityProfiles['720p'];
    const segmentDuration = 6;
    const estimatedSize = (profile.bitrate * segmentDuration) / 8;
    return {
      url: `/segments/${videoId}/${quality}/seg_${segmentIndex}.ts`,
      size: estimatedSize,
      duration: segmentDuration,
    };
  }
}

export const streamingService = new StreamingService();
