// Mock данные для админ панели
export interface VisitStats {
  date: string;
  visits: number;
}

export interface PluginAdditionStats {
  date: string;
  count: number;
}

// Генерируем mock данные для посещений за последние 30 дней
export const generateVisitStats = (): VisitStats[] => {
  const stats: VisitStats[] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Генерируем случайное количество посещений (50-500)
    const visits = Math.floor(Math.random() * 450) + 50;
    
    stats.push({
      date: date.toISOString().split('T')[0],
      visits
    });
  }
  
  return stats;
};

// Генерируем mock данные для добавления плагинов за последние 30 дней
export const generatePluginAdditionStats = (): PluginAdditionStats[] => {
  const stats: PluginAdditionStats[] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Генерируем случайное количество добавленных плагинов (0-5)
    const count = Math.floor(Math.random() * 6);
    
    stats.push({
      date: date.toISOString().split('T')[0],
      count
    });
  }
  
  return stats;
};

// Mock данные для времени добавления плагинов
export const generatePluginTimeline = () => {
  const timeline: Array<{
    name: string;
    addedDate: string;
    author: string;
    category: string;
  }> = [];
  const today = new Date();
  
  // Генерируем случайные даты добавления для существующих плагинов
  const pluginNames = [
    'React Hook Form',
    'Axios HTTP Client', 
    'Lodash Utilities',
    'Moment.js Date Library',
    'Chart.js Visualization',
    'Express.js Framework',
    'Socket.io Real-time',
    'Redux State Manager',
    'Webpack Bundler',
    'ESLint Code Linter'
  ];
  
  pluginNames.forEach((name, index) => {
    const daysAgo = Math.floor(Math.random() * 90) + 1; // 1-90 дней назад
    const addedDate = new Date(today);
    addedDate.setDate(addedDate.getDate() - daysAgo);
    
    timeline.push({
      name,
      addedDate: addedDate.toISOString().split('T')[0],
      author: `Author${index + 1}`,
      category: ['Frontend', 'Backend', 'Utility', 'Framework'][Math.floor(Math.random() * 4)]
    });
  });
  
  // Сортируем по дате добавления (новые сначала)
  return timeline.sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime());
};