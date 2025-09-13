import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PluginIndex, IndexedPlugin } from '../types/plugin';
import { ApiService } from '../services/api';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { generateVisitStats, generatePluginAdditionStats } from '../data/mockStats';
import {
  Shield,
  Users,
  Package,
  TrendingUp,
  Calendar,
  Eye,
  ArrowLeft,
  RefreshCw,
  Activity,
  Clock,
  GitBranch
} from 'lucide-react';

interface PluginStats {
  totalPlugins: number;
  uniqueAuthors: number;
  uniqueRepositories: number;
  averageStars: number;
  totalStars: number;
  languageDistribution: { name: string; value: number; color: string }[];
  monthlyAdditions: { month: string; count: number }[];
  topAuthors: { author: string; count: number; stars: number }[];
  topRepositories: { repo: string; count: number; stars: number }[];
  recentPlugins: IndexedPlugin[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [pluginIndex, setPluginIndex] = useState<PluginIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitCount, setVisitCount] = useState(0);
  const [visitStats, setVisitStats] = useState<Array<{date: string; visits: number}>>([]);
  const [pluginStats, setPluginStats] = useState<Array<{date: string; count: number}>>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadPlugins();
    loadVisitStats();
    loadPluginStats();
  }, []);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const data = await ApiService.fetchPluginIndex();
      setPluginIndex(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Ошибка загрузки данных плагинов');
      console.error('Error loading plugins:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVisitStats = () => {
    // Загружаем статистику посещений из mock данных
    const visitData = generateVisitStats();
    const totalVisits = visitData.reduce((sum, day) => sum + day.visits, 0);
    setVisitCount(totalVisits);
    setVisitStats(visitData);
  };

  const loadPluginStats = () => {
    // Загружаем статистику добавления плагинов из mock данных
    const pluginData = generatePluginAdditionStats();
    setPluginStats(pluginData);
  };

  const stats: PluginStats | null = useMemo(() => {
    if (!pluginIndex) return null;

    const plugins = pluginIndex.items;
    const authors = new Set(plugins.map(p => p.plugin_author));
    const repositories = new Set(plugins.map(p => p.repository.full_name));
    const totalStars = plugins.reduce((sum, p) => sum + (p.repository.stargazers_count || 0), 0);
    const averageStars = totalStars / plugins.length;

    // Распределение по языкам
    const languageCount = plugins.reduce((acc, p) => {
      const lang = p.language || 'Unknown';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const languageDistribution = Object.entries(languageCount)
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Месячные добавления (симуляция на основе created_at)
    const monthlyData = plugins.reduce((acc, p) => {
      if (p.repository?.created_at) {
        const date = new Date(p.repository.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        acc[monthKey] = (acc[monthKey] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const monthlyAdditions = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));

    // Топ авторы
    const authorStats = plugins.reduce((acc, p) => {
      const author = p.plugin_author;
      if (author && !acc[author]) {
        acc[author] = { count: 0, stars: 0 };
      }
      if (author) {
        acc[author].count += 1;
        acc[author].stars += p.repository?.stargazers_count || 0;
      }
      return acc;
    }, {} as Record<string, { count: number; stars: number }>);

    const topAuthors = Object.entries(authorStats)
      .map(([author, stats]) => ({ author, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Топ репозитории
    const repoStats = plugins.reduce((acc, p) => {
      const repo = p.repository?.full_name;
      if (repo && !acc[repo]) {
        acc[repo] = { count: 0, stars: p.repository?.stargazers_count || 0 };
      }
      if (repo) {
        acc[repo].count += 1;
      }
      return acc;
    }, {} as Record<string, { count: number; stars: number }>);

    const topRepositories = Object.entries(repoStats)
      .map(([repo, stats]) => ({ repo, ...stats }))
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 10);

    // Недавние плагины
    const recentPlugins = plugins
      .filter(p => p.indexed_at)
      .sort((a, b) => new Date(b.indexed_at!).getTime() - new Date(a.indexed_at!).getTime())
      .slice(0, 10);

    return {
      totalPlugins: plugins.length,
      uniqueAuthors: authors.size,
      uniqueRepositories: repositories.size,
      averageStars,
      totalStars,
      languageDistribution,
      monthlyAdditions,
      topAuthors,
      topRepositories,
      recentPlugins
    };
  }, [pluginIndex]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p style={{ color: 'var(--text-secondary)' }}>Загрузка данных админ панели...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="mb-4" style={{ color: 'var(--error-color)' }}>
            <Package className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Ошибка загрузки</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={loadPlugins}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="shadow-sm border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center transition-colors hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Назад к сайту
              </button>
              <div className="h-6 w-px" style={{ backgroundColor: 'var(--border-color)' }}></div>
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Админ Панель</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Обновлено: {lastUpdated.toLocaleString('ru-RU')}
              </div>
              <button
                onClick={loadPlugins}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Всего плагинов</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalPlugins.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Посещений сайта</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{visitCount.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Уникальных авторов</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.uniqueAuthors.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Общее количество звезд</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalStars.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Additions Chart */}
          <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center" style={{ color: 'var(--text-primary)' }}>
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Добавление плагинов по месяцам
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyAdditions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Language Distribution */}
          <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center" style={{ color: 'var(--text-primary)' }}>
              <GitBranch className="h-5 w-5 mr-2 text-green-600" />
              Распределение по языкам
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.languageDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.languageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Website Visits Chart */}
          <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center" style={{ color: 'var(--text-primary)' }}>
              <Eye className="h-5 w-5 mr-2 text-purple-600" />
              Посещения сайта (последние 30 дней)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={visitStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="visits" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Plugin Additions Chart */}
          <div className="rounded-lg shadow-sm p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center" style={{ color: 'var(--text-primary)' }}>
              <Activity className="h-5 w-5 mr-2 text-orange-600" />
              Добавление плагинов (последние 30 дней)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pluginStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#F97316" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Authors */}
          <div className="rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-lg font-semibold flex items-center" style={{ color: 'var(--text-primary)' }}>
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                Топ авторы
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.topAuthors.map((author, index) => (
                  <div key={author.author} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{author.author}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{author.count} плагинов</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{author.stars}</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>звезд</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Repositories */}
          <div className="rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-lg font-semibold flex items-center" style={{ color: 'var(--text-primary)' }}>
                <Package className="h-5 w-5 mr-2 text-green-600" />
                Топ репозитории
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.topRepositories.map((repo, index) => (
                  <div key={repo.repo} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-semibold text-green-600">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{repo.repo}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{repo.count} плагинов</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{repo.stars}</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>звезд</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Plugins */}
        <div className="rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-semibold flex items-center" style={{ color: 'var(--text-primary)' }}>
              <Clock className="h-5 w-5 mr-2 text-orange-600" />
              Недавно добавленные плагины
            </h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y" style={{ borderColor: 'var(--border-color)' }}>
                <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Плагин
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Автор
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Репозиторий
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Звезды
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Добавлен
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                  {stats.recentPlugins.map((plugin, index) => (
                    <tr key={index} className="hover:opacity-80">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{plugin.plugin_name}</div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{plugin.plugin_version}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                        {plugin.plugin_author}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800">
                        <a href={plugin.repository.html_url} target="_blank" rel="noopener noreferrer">
                          {plugin.repository.full_name}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                        {plugin.repository.stargazers_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {plugin.indexed_at ? new Date(plugin.indexed_at).toLocaleString('ru-RU') : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};