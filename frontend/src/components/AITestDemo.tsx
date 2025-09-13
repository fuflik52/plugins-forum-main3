import React from 'react';
import { AIPluginInfo } from './AIPluginInfo';
import type { IndexedPlugin } from '../types/plugin';

// Тестовый компонент для демонстрации AI функционала
export const AITestDemo: React.FC = () => {
  // Создаем тестовый плагин для демонстрации
  const testPlugin: IndexedPlugin = {
    plugin_name: 'AdminTools',
    plugin_version: '2.1.0',
    plugin_author: 'RustDeveloper',
    plugin_description: 'Comprehensive admin tools for server management with permissions, commands, teleportation, and player moderation features',
    language: 'C#',
    repository: {
      full_name: 'rustdev/admin-tools',
      name: 'admin-tools',
      description: 'Advanced administration plugin for Rust servers with teleportation, player management, and moderation features',
      html_url: 'https://github.com/rustdev/admin-tools',
      owner_login: 'rustdev',
      owner_url: 'https://github.com/rustdev',
      default_branch: 'main',
      stargazers_count: 245,
      forks_count: 67,
      open_issues_count: 12,
      created_at: '2023-01-15T10:30:00Z'
    },
    file: {
      path: 'oxide/plugins/AdminTools.cs',
      html_url: 'https://github.com/rustdev/admin-tools/blob/main/AdminTools.cs',
      raw_url: 'https://raw.githubusercontent.com/rustdev/admin-tools/main/AdminTools.cs'
    },
    indexed_at: '2024-01-20T15:45:00Z'
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">🤖 AI Описание Плагина - Демо</h2>
      
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">Тестовый плагин:</h3>
        <p className="text-sm text-gray-600">
          <strong>Название:</strong> {testPlugin.plugin_name}<br/>
          <strong>Версия:</strong> {testPlugin.plugin_version}<br/>
          <strong>Автор:</strong> {testPlugin.plugin_author}
        </p>
      </div>
      
      <AIPluginInfo plugin={testPlugin} />
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        <p><strong>💡 Как это работает:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Нажмите кнопку "Информация (AI)"</li>
          <li>AI анализирует метаданные плагина</li>
          <li>Генерируется описание функционала</li>
          <li>Работает без API ключей!</li>
        </ul>
      </div>
    </div>
  );
};