import { SliderItem, ApiResponse } from '../types';

// Use the production backend API URL
const API_BASE_URL = 'https://hfl-backend.onrender.com/api';

class SliderService {
  private async apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      console.log(`Making slider API call to: ${API_BASE_URL}${endpoint}`);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log(`Slider API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Slider API error response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Slider API response data:`, result);
      return result;
    } catch (error: any) {
      console.error(`Slider API call failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error.message || 'Slider API call failed',
      };
    }
  }

  // Get all slider items
  async getSliderItems(): Promise<ApiResponse<SliderItem[]>> {
    return this.apiCall<SliderItem[]>('/slider');
  }

  // Get active slider items only
  async getActiveSliderItems(): Promise<ApiResponse<SliderItem[]>> {
    try {
      const response = await this.getSliderItems();

      if (response.success && response.data) {
        // Filter only active items
        const activeItems = response.data.filter(item => item.isActive);
        return {
          success: true,
          data: activeItems
        };
      }

      return response;
    } catch (error: any) {
      console.error('Error getting active slider items:', error);
      return {
        success: false,
        error: error.message || 'Failed to get active slider items',
      };
    }
  }

  // Get a specific slider item
  async getSliderItem(id: string): Promise<ApiResponse<SliderItem>> {
    return this.apiCall<SliderItem>(`/slider/${id}`);
  }
}

// Export singleton instance
export const sliderService = new SliderService();
export default SliderService;
