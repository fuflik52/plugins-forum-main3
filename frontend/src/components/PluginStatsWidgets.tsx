import React, { useMemo } from 'react';
import type { IndexedPlugin } from '../types/plugin';
import { TrendingUp, Clock, Package, Zap } from 'lucide-react';

interface PluginStatsWidgetsProps {
  plugins: IndexedPlugin[];
}

interface StatWidget {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  gradient: string;
  description: string;
}

export const PluginStatsWidgets: React.FC<PluginStatsWidgetsProps> = ({ plugins }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Plugins added in last 24 hours
    const recentPlugins = plugins.filter(plugin => {
      const createdDate = new Date(plugin.repository.created_at || plugin.indexed_at || '');
      return createdDate >= twentyFourHoursAgo;
    });

    // Plugins updated in last 24 hours
    const updatedPlugins = plugins.filter(plugin => {
      const updatedDate = new Date(plugin.commits?.latest.committed_at || plugin.indexed_at || '');
      return updatedDate >= twentyFourHoursAgo;
    });

    // Trending plugins (updated in last 7 days)
    const trendingPlugins = plugins.filter(plugin => {
      const updatedDate = new Date(plugin.commits?.latest.committed_at || plugin.indexed_at || '');
      return updatedDate >= sevenDaysAgo;
    });

    const widgets: StatWidget[] = [
      {
        title: 'Новые за 24ч',
        value: recentPlugins.length,
        icon: Package,
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        description: 'Добавлено плагинов'
      },
      {
        title: 'Обновлено за 24ч',
        value: updatedPlugins.length,
        icon: Clock,
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        description: 'Обновлений плагинов'
      },
      {
        title: 'Активные за неделю',
        value: trendingPlugins.length,
        icon: TrendingUp,
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        description: 'Активных плагинов'
      },
      {
        title: 'Всего плагинов',
        value: plugins.length,
        icon: Zap,
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        description: 'В каталоге'
      }
    ];

    return widgets;
  }, [plugins]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className="relative overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg group"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)'
            }}
          >
            {/* Background gradient overlay */}
            <div 
              className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300"
              style={{ background: stat.gradient }}
            />
            
            {/* Content */}
            <div className="relative p-4">
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                  style={{ background: stat.gradient }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-right">
                  <div 
                    className="text-2xl font-bold leading-none"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {stat.value.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 
                  className="text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {stat.title}
                </h3>
                <p 
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {stat.description}
                </p>
              </div>
            </div>
            
            {/* Animated border */}
            <div 
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${stat.gradient.match(/#[a-fA-F0-9]{6}/)?.[0] || '#3b82f6'}, transparent)`,
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'xor',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                padding: '1px'
              }}
            />
          </div>
        );
      })}
    </div>
  );
};