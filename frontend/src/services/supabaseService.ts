/**
 * 🗄️ Supabase интеграция для работы с базой данных плагинов
 * Предоставляет типизированный API для работы с плагинами
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Типы данных
export interface Plugin {
  id: string;
  name: string;
  description: string | null;
  size: number;
  author: string | null;
  version: string | null;
  github_url: string | null;
  download_url: string | null;
  tags: string[];
  category: string | null;
  language: string | null;
  stars: number;
  forks: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  download_count: number;
  rating: number;
  metadata: Record<string, unknown>;
}

export interface PluginPublic {
  id: string;
  name: string;
  description: string | null;
  size: number;
  author: string | null;
  version: string | null;
  github_url: string | null;
  download_url: string | null;
  tags: string[];
  category: string | null;
  language: string | null;
  stars: number;
  forks: number;
  last_updated: string;
  created_at: string;
  download_count: number;
  rating: number;
}

export interface PluginStats {
  total_plugins: number;
  active_plugins: number;
  total_categories: number;
  total_languages: number;
  avg_stars: number;
  last_update: string;
}

export interface SearchResult extends PluginPublic {
  rank: number;
}

export interface SearchParams {
  searchTerm?: string;
  category?: string;
  language?: string;
  limit?: number;
  offset?: number;
}

// Конфигурация Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase не настроен. Установите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env файле');
}

class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private isAvailable = false;

  // Публичный геттер для доступа к Supabase клиенту
  public getClient(): SupabaseClient | null {
    return this.supabase;
  }

  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase() {
    try {
      if (supabaseUrl && supabaseAnonKey) {
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);
        this.isAvailable = true;
        console.log('✅ Supabase клиент инициализирован');
      } else {
        console.warn('⚠️ Supabase недоступен - отсутствуют переменные окружения');
      }
    } catch (error) {
      console.error('❌ Ошибка инициализации Supabase:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Проверка доступности Supabase
   */
  public isSupabaseAvailable(): boolean {
    return this.isAvailable && this.supabase !== null;
  }

  /**
   * Получение всех плагинов с пагинацией
   */
  async getPlugins(limit = 50, offset = 0): Promise<PluginPublic[]> {
    if (!this.isSupabaseAvailable()) {
      console.warn('⚠️ Supabase недоступен, возвращаем пустой массив');
      return [];
    }

    try {
      const { data, error } = await this.supabase!
        .from('plugins_public')
        .select('*')
        .order('stars', { ascending: false })
        .order('last_updated', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Ошибка получения плагинов:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Критическая ошибка получения плагинов:', error);
      return [];
    }
  }

  /**
   * Поиск плагинов
   */
  async searchPlugins(params: SearchParams): Promise<SearchResult[]> {
    if (!this.isSupabaseAvailable()) {
      console.warn('⚠️ Supabase недоступен для поиска');
      return [];
    }

    try {
      const { data, error } = await this.supabase!
        .rpc('search_plugins', {
          search_term: params.searchTerm || '',
          category_filter: params.category || null,
          language_filter: params.language || null,
          limit_count: params.limit || 50,
          offset_count: params.offset || 0
        });

      if (error) {
        console.error('❌ Ошибка поиска плагинов:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Критическая ошибка поиска:', error);
      return [];
    }
  }

  /**
   * Получение плагина по ID
   */
  async getPluginById(id: string): Promise<PluginPublic | null> {
    if (!this.isSupabaseAvailable()) {
      return null;
    }

    try {
      const { data, error } = await this.supabase!
        .from('plugins_public')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Ошибка получения плагина:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Критическая ошибка получения плагина:', error);
      return null;
    }
  }

  /**
   * Получение плагина по имени
   */
  async getPluginByName(name: string): Promise<PluginPublic | null> {
    if (!this.isSupabaseAvailable()) {
      return null;
    }

    try {
      const { data, error } = await this.supabase!
        .from('plugins_public')
        .select('*')
        .eq('name', name)
        .single();

      if (error) {
        console.error('❌ Ошибка получения плагина по имени:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Критическая ошибка получения плагина по имени:', error);
      return null;
    }
  }

  /**
   * Получение статистики плагинов
   */
  async getPluginStats(): Promise<PluginStats | null> {
    if (!this.isSupabaseAvailable()) {
      return null;
    }

    try {
      const { data, error } = await this.supabase!
        .rpc('get_plugins_stats');

      if (error) {
        console.error('❌ Ошибка получения статистики:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('❌ Критическая ошибка получения статистики:', error);
      return null;
    }
  }

  /**
   * Получение уникальных категорий
   */
  async getCategories(): Promise<string[]> {
    if (!this.isSupabaseAvailable()) {
      return [];
    }

    try {
      const { data, error } = await this.supabase!
        .from('plugins_public')
        .select('category')
        .not('category', 'is', null);

      if (error) {
        console.error('❌ Ошибка получения категорий:', error);
        return [];
      }

      const categories = [...new Set(data?.map((item: { category: string }) => item.category).filter(Boolean))] as string[];
      return categories.sort();
    } catch (error) {
      console.error('❌ Критическая ошибка получения категорий:', error);
      return [];
    }
  }

  /**
   * Получение уникальных языков программирования
   */
  async getLanguages(): Promise<string[]> {
    if (!this.isSupabaseAvailable()) {
      return [];
    }

    try {
      const { data, error } = await this.supabase!
        .from('plugins_public')
        .select('language')
        .not('language', 'is', null);

      if (error) {
        console.error('❌ Ошибка получения языков:', error);
        return [];
      }

      const languages = [...new Set(data?.map((item: { language: string }) => item.language).filter(Boolean))] as string[];
      return languages.sort();
    } catch (error) {
      console.error('❌ Критическая ошибка получения языков:', error);
      return [];
    }
  }

  /**
   * Инкремент счетчика загрузок
   */
  async incrementDownloadCount(pluginId: string): Promise<boolean> {
    if (!this.isSupabaseAvailable()) {
      return false;
    }

    try {
      const { error } = await this.supabase!
        .rpc('increment_download_count', { plugin_id: pluginId });

      if (error) {
        console.error('❌ Ошибка инкремента загрузок:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Критическая ошибка инкремента загрузок:', error);
      return false;
    }
  }

  /**
   * Получение популярных плагинов
   */
  async getPopularPlugins(limit = 10): Promise<PluginPublic[]> {
    if (!this.isSupabaseAvailable()) {
      return [];
    }

    try {
      const { data, error } = await this.supabase!
        .from('plugins_public')
        .select('*')
        .order('stars', { ascending: false })
        .order('download_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Ошибка получения популярных плагинов:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Критическая ошибка получения популярных плагинов:', error);
      return [];
    }
  }

  /**
   * Получение недавно обновленных плагинов
   */
  async getRecentlyUpdatedPlugins(limit = 10): Promise<PluginPublic[]> {
    if (!this.isSupabaseAvailable()) {
      return [];
    }

    try {
      const { data, error } = await this.supabase!
        .from('plugins_public')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Ошибка получения недавно обновленных плагинов:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Критическая ошибка получения недавно обновленных плагинов:', error);
      return [];
    }
  }

  /**
   * Получение плагинов по категории
   */
  async getPluginsByCategory(category: string, limit = 20): Promise<PluginPublic[]> {
    if (!this.isSupabaseAvailable()) {
      return [];
    }

    try {
      const { data, error } = await this.supabase!
        .from('plugins_public')
        .select('*')
        .eq('category', category)
        .order('stars', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Ошибка получения плагинов по категории:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Критическая ошибка получения плагинов по категории:', error);
      return [];
    }
  }

  /**
   * Получение плагинов по языку программирования
   */
  async getPluginsByLanguage(language: string, limit = 20): Promise<PluginPublic[]> {
    if (!this.isSupabaseAvailable()) {
      return [];
    }

    try {
      const { data, error } = await this.supabase!
        .from('plugins_public')
        .select('*')
        .eq('language', language)
        .order('stars', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Ошибка получения плагинов по языку:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Критическая ошибка получения плагинов по языку:', error);
      return [];
    }
  }
}

// Экспорт синглтона
export const supabaseService = new SupabaseService();
export default supabaseService;