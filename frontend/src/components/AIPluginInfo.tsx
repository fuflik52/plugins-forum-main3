import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import type { IndexedPlugin } from '../types/plugin';
import { AIService } from '../services/aiService';

interface AIPluginInfoProps {
  plugin: IndexedPlugin;
  className?: string;
}

export const AIPluginInfo: React.FC<AIPluginInfoProps> = ({ plugin, className = '' }) => {
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Автоматически генерируем описание при загрузке компонента
  React.useEffect(() => {
    const generateDescription = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const aiDescription = await AIService.generatePluginDescription(plugin);
        setDescription(aiDescription);
      } catch (err) {
        setError('Не удалось сгенерировать описание. Попробуйте еще раз.');
        console.error('AI Description Error:', err);
      } finally {
        setLoading(false);
      }
    };

    generateDescription();
  }, [plugin]);

  const handleGenerateDescription = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const aiDescription = await AIService.generatePluginDescription(plugin);
      setDescription(aiDescription);
    } catch (err) {
      setError('Не удалось сгенерировать описание. Попробуйте еще раз.');
      console.error('AI Description Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setDescription('');
    handleGenerateDescription();
  };

  // Функция для форматирования markdown-подобного текста
  const formatDescription = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
      .replace(/`(.*?)`/g, '<code style="background-color: var(--bg-tertiary); color: var(--text-primary);" class="px-1 py-0.5 rounded text-sm font-mono">$1</code>') // `code`
      .replace(/\n/g, '<br/>'); // новые строки
  };

  return (
    <div className={`rounded-lg p-4 ${className}`} style={{ background: 'linear-gradient(to right, var(--purple-bg), var(--info-bg))' }}>
      {/* Заголовок */}
      <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--purple-text)' }}>
        <Sparkles className="h-4 w-4" />
        <span className="font-semibold text-sm">AI Описание функционала</span>
      </div>

      {/* Состояние загрузки */}
      {loading && (
        <div className="rounded-lg p-4 border shadow-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--purple-border)' }}>
          <div className="flex items-center justify-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Анализируем плагин и генерируем описание...</span>
          </div>
        </div>
      )}

      {/* Отображение ошибки */}
      {error && (
        <div className="border rounded-lg p-3" style={{ backgroundColor: 'var(--error-bg)', borderColor: 'var(--error-border)' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--error-text)' }}>
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium text-sm">Ошибка генерации</span>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--error-text)' }}>{error}</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-colors"
            style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error-text)' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <RefreshCw className="h-3 w-3" />
            Попробовать снова
          </button>
        </div>
      )}

      {/* Отображение описания */}
      {description && !loading && (
        <div className="space-y-3">
          <div className="rounded-lg p-4 border shadow-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--purple-border)' }}>
            <div 
              className="leading-relaxed text-sm"
              style={{ color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: formatDescription(description) }}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors"
              style={{ backgroundColor: 'var(--purple-bg)', color: 'var(--purple-text)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <RefreshCw className="h-3 w-3" />
              Обновить описание
            </button>
          </div>
          
          <div className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
            🤖 Описание сгенерировано ИИ на основе анализа метаданных плагина
          </div>
        </div>
      )}
    </div>
  );
};