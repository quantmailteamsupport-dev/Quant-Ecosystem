// ============================================================================
// QuantNeon - Frontend API Client
// ============================================================================

import type { Post, Reel, Story, Profile, Game, Product, ARFilter } from '../types';

interface ApiResponse<T> { success: boolean; data?: T; error?: { code: string; message: string }; }
interface RequestOptions { method?: string; body?: unknown; params?: Record<string, string>; }

class QuantNeonApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3006') { this.baseUrl = baseUrl; }
  setToken(token: string) { this.token = token; }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, params } = options;
    let url = `${this.baseUrl}${path}`;
    if (params) { const sp = new URLSearchParams(params); url += `?${sp.toString()}`; }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return response.json() as Promise<ApiResponse<T>>;
  }

  // Posts
  async createPost(data: any) { return this.request('/posts', { method: 'POST', body: data }); }
  async getFeed(page?: number) { return this.request<{ posts: Post[] }>('/posts/feed', { params: page ? { page: String(page) } : undefined }); }
  async getPost(id: string) { return this.request<{ post: Post }>(`/posts/${id}`); }
  async likePost(id: string) { return this.request(`/posts/${id}/like`, { method: 'POST' }); }
  async commentOnPost(id: string, text: string) { return this.request(`/posts/${id}/comment`, { method: 'POST', body: { text } }); }

  // Reels
  async getReelsFeed() { return this.request<{ reels: Reel[] }>('/reels/feed'); }
  async createReel(data: any) { return this.request('/reels', { method: 'POST', body: data }); }
  async likeReel(id: string) { return this.request(`/reels/${id}/like`, { method: 'POST' }); }

  // Stories
  async createStory(data: any) { return this.request('/stories', { method: 'POST', body: data }); }
  async getStoriesFeed() { return this.request('/stories/feed'); }
  async viewStory(id: string) { return this.request(`/stories/${id}/view`, { method: 'POST' }); }

  // Profiles
  async getProfile(id: string) { return this.request<{ profile: Profile }>(`/profiles/${id}`); }
  async follow(id: string) { return this.request(`/profiles/${id}/follow`, { method: 'POST' }); }
  async unfollow(id: string) { return this.request(`/profiles/${id}/follow`, { method: 'DELETE' }); }

  // Games
  async getGames() { return this.request<{ games: Game[] }>('/games'); }
  async startGame(id: string) { return this.request(`/games/${id}/start`, { method: 'POST' }); }
  async gameAction(id: string, action: string, data: any) { return this.request(`/games/${id}/action`, { method: 'POST', body: { action, data } }); }

  // Shopping
  async getProducts() { return this.request<{ products: Product[] }>('/shopping/products'); }
  async addToCart(productId: string, quantity: number) { return this.request('/shopping/cart', { method: 'POST', body: { productId, quantity } }); }
  async checkout() { return this.request('/shopping/checkout', { method: 'POST' }); }

  // AR/VR
  async getARFilters() { return this.request<{ filters: ARFilter[] }>('/ar/filters'); }
  async processAR(mediaUrl: string, filterId: string) { return this.request('/ar/process', { method: 'POST', body: { mediaUrl, filterId } }); }

  // Explore
  async getExploreFeed() { return this.request('/explore'); }
  async search(query: string) { return this.request('/explore/search', { params: { q: query } }); }

  // AI
  async suggestHashtags(caption: string) { return this.request('/ai/hashtags/suggest', { method: 'POST', body: { caption } }); }
  async generateCaption(mediaUrl: string) { return this.request('/ai/caption/generate', { method: 'POST', body: { mediaUrl } }); }
}

export const apiClient = new QuantNeonApiClient();
export default QuantNeonApiClient;
