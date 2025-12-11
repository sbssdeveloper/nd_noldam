import { apiService } from '../../apiService';

export interface TypeSetting {
  id: number;
  type: string;
  title: string;
  description?: string;
  image?: string;
  deactivationDate?: string;
  scope: string;
  status: string;
  meetings: number[];
  categories: number[];
  createDate: string;
  lastUpdated: string;
}

export interface CreateTypeSettingRequest {
  type: 'A' | 'B';
  title: string;
  description?: string;
  image?: string;
  deactivationDate?: string;
  publicScope: 'public' | 'categories';
  meetings: number[];
  categories: number[];
  status?: string;
}

export interface TypeSettingsResponse {
  success: boolean;
  data?: TypeSetting;
  error?: string;
}

export class TypeSettingsApiService {
  // Get type settings
  async getTypeSettings(type?: string): Promise<TypeSetting[]> {
    const endpoint = type ? `/admin/type-settings?type=${type}` : '/admin/type-settings';
    const response = await apiService.get<TypeSetting[]>(endpoint);
    return response.data || [];
  }

  // Create a new type setting
  async createTypeSetting(data: CreateTypeSettingRequest): Promise<TypeSettingsResponse> {
    try {
      const response = await apiService.post<TypeSettingsResponse>('/admin/type-settings', data);
      return response.data || { success: false, error: 'Failed to create type setting' };
    } catch (error) {
      console.error('Error creating type setting:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create type setting' 
      };
    }
  }

  // Update an existing type setting
  async updateTypeSetting(id: number, data: Partial<CreateTypeSettingRequest> & { status?: string }): Promise<TypeSettingsResponse> {
    try {
      const response = await apiService.put<TypeSettingsResponse>(`/admin/type-settings/${id}`, data);
      return response.data || { success: false, error: 'Failed to update type setting' };
    } catch (error) {
      console.error('Error updating type setting:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update type setting' 
      };
    }
  }

  // Delete a type setting
  async deleteTypeSetting(id: number): Promise<TypeSettingsResponse> {
    try {
      const response = await apiService.delete<TypeSettingsResponse>(`/admin/type-settings/${id}`);
      return response.data || { success: false, error: 'Failed to delete type setting' };
    } catch (error) {
      console.error('Error deleting type setting:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete type setting' 
      };
    }
  }
}

export const typeSettingsApiService = new TypeSettingsApiService();
