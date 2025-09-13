import type { IndexedPlugin } from '../types/plugin';

// Бесплатный AI сервис для описания плагинов
// Использует Hugging Face Inference API без необходимости в API ключах
export class AIService {
  private static readonly HF_API_URL = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
  private static readonly BACKUP_API_URL = 'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill';
  
  /**
   * Генерирует описание функционала плагина с помощью бесплатного AI
   * @param plugin - данные плагина
   * @returns Promise с описанием функционала
   */
  static async generatePluginDescription(plugin: IndexedPlugin): Promise<string> {
    try {
      // Сначала проверяем доступность сервисов
      const isAvailable = await this.checkServiceAvailability();
      
      if (isAvailable) {
        // Формируем контекст для AI на основе данных плагина
        const context = this.buildPluginContext(plugin);
        
        // Пробуем основной API
        let description = await this.callHuggingFaceAPI(context, this.HF_API_URL);
        
        // Если основной API не работает, пробуем резервный
        if (!description) {
          description = await this.callHuggingFaceAPI(context, this.BACKUP_API_URL);
        }
        
        // Если получили описание от AI, форматируем его
        if (description) {
          return this.formatDescription(description, plugin);
        }
      }
      
      // Если AI API недоступны, генерируем описание на основе метаданных
      return this.generateFallbackDescription(plugin);
    } catch (error) {
      console.warn('AI Service error:', error);
      return this.generateFallbackDescription(plugin);
    }
  }
  
  /**
   * Строит контекст для AI на основе данных плагина
   */
  private static buildPluginContext(plugin: IndexedPlugin): string {
    const parts = [];
    
    if (plugin.plugin_name) {
      parts.push(`Plugin name: ${plugin.plugin_name}`);
    }
    
    if (plugin.plugin_description) {
      parts.push(`Description: ${plugin.plugin_description}`);
    }
    
    if (plugin.plugin_author) {
      parts.push(`Author: ${plugin.plugin_author}`);
    }
    
    if (plugin.repository?.description) {
      parts.push(`Repository: ${plugin.repository.description}`);
    }
    
    // Добавляем информацию о файле
    if (plugin.file?.path) {
      const fileName = plugin.file.path.split('/').pop() || '';
      parts.push(`File: ${fileName}`);
    }
    
    const context = parts.join('. ');
    return `Describe the functionality of this Rust/Oxide plugin: ${context}. What does this plugin do?`;
  }
  
  /**
   * Вызывает Hugging Face API
   */
  private static async callHuggingFaceAPI(prompt: string, apiUrl: string): Promise<string | null> {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 200,
            temperature: 0.7,
            do_sample: true,
            top_p: 0.9
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Обрабатываем разные форматы ответов от разных моделей
      if (Array.isArray(data) && data[0]?.generated_text) {
        return data[0].generated_text;
      }
      
      if (data.generated_text) {
        return data.generated_text;
      }
      
      return null;
    } catch (error) {
      console.warn(`HuggingFace API call failed:`, error);
      return null;
    }
  }
  
  /**
   * Генерирует описание на основе метаданных (fallback)
   */
  private static generateFallbackDescription(plugin: IndexedPlugin): string {
    const features = [];
    const commands = [];
    const permissions = [];
    
    // Анализируем название плагина для определения функций
    const name = (plugin.plugin_name || '').toLowerCase();
    const description = (plugin.plugin_description || '').toLowerCase();
    const repoDesc = (plugin.repository?.description || '').toLowerCase();
    const allText = `${name} ${description} ${repoDesc}`;
    
    // Административные функции
    if (allText.includes('admin') || allText.includes('mod') || allText.includes('управление')) {
      features.push('административные функции');
      commands.push('/admin', '/mod', '/kick', '/ban');
      permissions.push('admintools.use', 'admintools.kick', 'admintools.ban');
    }
    
    // Чат и сообщения
    if (allText.includes('chat') || allText.includes('message') || allText.includes('чат')) {
      features.push('управление чатом и сообщениями');
      commands.push('/mute', '/unmute', '/clearchat');
      permissions.push('chat.mute', 'chat.admin');
    }
    
    // Экономика
    if (allText.includes('economy') || allText.includes('money') || allText.includes('coin') || allText.includes('экономик')) {
      features.push('экономическую систему');
      commands.push('/balance', '/pay', '/shop');
      permissions.push('economy.use', 'economy.admin');
    }
    
    // Телепортация
    if (allText.includes('teleport') || allText.includes('tp') || allText.includes('телепорт')) {
      features.push('систему телепортации');
      commands.push('/tp', '/tpa', '/tpaccept', '/tpdeny');
      permissions.push('teleport.use', 'teleport.admin');
    }
    
    // Дома и спавн
    if (allText.includes('home') || allText.includes('spawn') || allText.includes('дом')) {
      features.push('управление точками спавна и домами');
      commands.push('/home', '/sethome', '/spawn', '/setspawn');
      permissions.push('home.use', 'spawn.use');
    }
    
    // Предметы и киты
    if (allText.includes('kit') || allText.includes('item') || allText.includes('предмет')) {
      features.push('управление предметами и наборами');
      commands.push('/kit', '/give', '/item');
      permissions.push('kit.use', 'item.give');
    }
    
    // Кланы и команды
    if (allText.includes('clan') || allText.includes('team') || allText.includes('group') || allText.includes('клан')) {
      features.push('систему кланов и команд');
      commands.push('/clan', '/team', '/invite', '/leave');
      permissions.push('clan.use', 'team.create');
    }
    
    // PvP и рейды
    if (allText.includes('raid') || allText.includes('pvp') || allText.includes('бой')) {
      features.push('PvP и рейдовые механики');
      commands.push('/pvp', '/raid', '/war');
      permissions.push('pvp.use', 'raid.participate');
    }
    
    // Строительство
    if (allText.includes('build') || allText.includes('construct') || allText.includes('строит')) {
      features.push('строительные функции');
      commands.push('/build', '/remove', '/undo');
      permissions.push('build.use', 'build.admin');
    }
    
    // Информация и помощь
    if (allText.includes('info') || allText.includes('help') || allText.includes('информац')) {
      features.push('информационные команды');
      commands.push('/info', '/help', '/rules');
      permissions.push('info.use');
    }
    
    // Защита и безопасность
    if (allText.includes('protect') || allText.includes('security') || allText.includes('защит')) {
      features.push('систему защиты территории');
      commands.push('/protect', '/claim', '/unclaim');
      permissions.push('protect.use', 'protect.admin');
    }
    
    let result = `🔧 **Функционал плагина ${plugin.plugin_name}:**\n\n`;
    
    if (features.length > 0) {
       result += `📋 **Основные возможности:**\n${features.map(f => `• ${f}`).join('\n')}\n\n`;
     }
     
     if (commands.length > 0) {
       result += `⌨️ **Основные команды:**\n${commands.slice(0, 6).map(c => `• \`${c}\``).join('\n')}\n\n`;
     }
     
     if (permissions.length > 0) {
       result += `🔐 **Разрешения:**\n${permissions.slice(0, 4).map(p => `• \`${p}\``).join('\n')}\n\n`;
     }
     
     // Добавляем информацию об авторе и версии
     result += `👤 **Автор:** ${plugin.plugin_author || 'Неизвестен'}\n`;
     result += `📦 **Версия:** ${plugin.plugin_version || 'Не указана'}\n`;
     result += `🏷️ **Язык:** ${plugin.language || 'C#'}`;
     
     return result;
  }
  
  /**
   * Форматирует и очищает описание
   */
  private static formatDescription(description: string, plugin: IndexedPlugin): string {
    // Убираем исходный промпт из ответа
    let cleaned = description.replace(/^.*?What does this plugin do\?\s*/i, '');
    
    // Убираем лишние символы и форматируем
    cleaned = cleaned.trim();
    cleaned = cleaned.replace(/^["']|["']$/g, ''); // Убираем кавычки в начале и конце
    cleaned = cleaned.replace(/\s+/g, ' '); // Убираем лишние пробелы
    
    // Если описание слишком короткое или некорректное, используем fallback
    if (cleaned.length < 20 || !cleaned.includes('plugin')) {
      return this.generateFallbackDescription(plugin);
    }
    
    // Добавляем точку в конце, если её нет
    if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
      cleaned += '.';
    }
    
    return cleaned;
  }
  
  /**
   * Проверяет доступность AI сервисов
   */
  static async checkServiceAvailability(): Promise<boolean> {
    try {
      // Быстрая проверка с таймаутом
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 секунды таймаут
      
      const response = await fetch(this.HF_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: 'test' }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Считаем сервис доступным, если не получили 503 или 401
      return response.status !== 503 && response.status !== 401;
    } catch {
      // При любой ошибке (включая таймаут) считаем сервис недоступным
      return false;
    }
  }
}