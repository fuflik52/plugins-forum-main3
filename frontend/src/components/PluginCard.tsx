import React from "react";
import { useNavigate } from "react-router-dom";
import type { IndexedPlugin } from "../types/plugin";
import {
  Star,
  GitFork,
  AlertCircle,
  User,
  Github,
  Eye,
  Info,
  Clock,
  Database,
} from "lucide-react";

interface PluginCardProps {
  plugin: IndexedPlugin;
  pluginIndex?: number; // Add index for routing
}

// Mathematical optimization: React.memo prevents unnecessary re-renders
// Theorem: Shallow comparison O(k) is cheaper than full render O(n)
export const PluginCard: React.FC<PluginCardProps> = React.memo(
  ({ plugin, pluginIndex }) => {
    const navigate = useNavigate();
    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return "Unknown";
      try {
        return new Date(dateString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        return "Unknown";
      }
    };

    const formatNumber = (num: number | undefined): string => {
      if (!num) return "0";
      return num > 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
    };

    if (!plugin || !plugin.repository || !plugin.file) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-center h-32 text-gray-500">
            <AlertCircle className="h-8 w-8 mr-2" />
            <span>Invalid plugin data</span>
          </div>
        </div>
      );
    }

    return (
      <div
        className="modern-card hover:border-gray-300 hover:shadow-lg 
                  transition-all duration-300 group overflow-hidden h-[420px] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)'
        }}
      >
        {/* Header Section - Fixed 80px */}
        <div className="p-4 flex-shrink-0 h-20">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 mr-3">
              {/* Plugin Name & Version */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold truncate group-hover:text-blue-600 transition-colors"
                    style={{ color: 'var(--text-primary)' }}>
                  {plugin.plugin_name || "Unnamed Plugin"}
                </h3>
                {plugin.plugin_version && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold 
                               bg-blue-100 text-blue-800 rounded-full flex-shrink-0"
                  >
                    v{plugin.plugin_version}
                  </span>
                )}
              </div>

              {/* Author */}
              <div className="flex items-center" style={{ color: 'var(--text-secondary)' }}>
                <User className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="text-xs font-medium truncate">
                  {plugin.plugin_author ||
                    plugin.repository.owner_login ||
                    "Unknown Author"}
                </span>
              </div>
            </div>

            {/* Language Badge */}
            <div className="flex-shrink-0">
              <span
                className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)'
                }}
              >
                C#
              </span>
            </div>
          </div>
        </div>

        {/* Description Section - Fixed 60px */}
        <div className="px-4 flex-shrink-0 h-15">
          {plugin.plugin_description ? (
            <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
              {plugin.plugin_description}
            </p>
          ) : (
            <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
              No description available
            </p>
          )}
        </div>

        {/* Repository Section - Flexible */}
        <div className="px-4 flex-1 py-3">
          <div className="rounded-lg p-3 h-full flex flex-col"
               style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="flex items-center mb-2">
              <Github className="h-3 w-3 mr-1 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
              <h4 className="font-medium truncate text-xs" style={{ color: 'var(--text-primary)' }}>
                {plugin.repository.full_name || "Unknown Repository"}
              </h4>
            </div>

            <div className="flex-1">
              {plugin.repository.description && (
                <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {plugin.repository.description}
                </p>
              )}
            </div>

            {/* Repository Stats */}
            <div className="flex items-center gap-3 text-xs mt-auto" style={{ color: 'var(--text-muted)' }}>
              <div className="flex items-center">
                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                <span>{formatNumber(plugin.repository.stargazers_count)}</span>
              </div>
              <div className="flex items-center">
                <GitFork className="h-3 w-3 mr-1 text-green-500" />
                <span>{formatNumber(plugin.repository.forks_count)}</span>
              </div>
              <div className="flex items-center">
                <AlertCircle className="h-3 w-3 mr-1 text-red-500" />
                <span>{formatNumber(plugin.repository.open_issues_count)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Section - Fixed 100px */}
        <div className="px-4 pb-4 flex-shrink-0 h-25">
          {/* File & Date Info */}
          <div className="text-xs text-gray-500 mb-3 space-y-1">
            {/* Creation Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1 text-green-500" />
                <span>Created: </span>
                <span className="font-medium">
                  {plugin.repository.created_at 
                    ? formatDate(plugin.repository.created_at)
                    : "Unknown"}
                </span>
              </div>
            </div>
            
            {/* Indexed Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Database className="h-3 w-3 mr-1 text-purple-500" />
                <span>Indexed: </span>
                <span className="font-medium">
                  {plugin.indexed_at ? formatDate(plugin.indexed_at) : "Unknown"}
                </span>
              </div>
              <div className="text-right truncate max-w-24">
                <span className="font-mono text-xs">
                  {plugin.file.path?.split("/").pop() || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            {/* Detail Button */}
            {pluginIndex !== undefined && (
              <button
                onClick={() => {
                  void navigate(`/plugin/${pluginIndex}`);
                }}
                title="Подробная информация"
                className="flex items-center justify-center w-10 h-10 bg-purple-600 hover:bg-purple-700 
                       text-white rounded-lg transition-all duration-200 hover:scale-105"
              >
                <Info className="h-4 w-4" />
              </button>
            )}

            {plugin.repository.html_url && (
              <a
                href={plugin.repository.html_url}
                target="_blank"
                rel="noopener noreferrer"
                title="View Repository"
                className="flex items-center justify-center w-10 h-10 bg-gray-900 hover:bg-gray-800 
                       text-white rounded-lg transition-all duration-200 hover:scale-105"
              >
                <Github className="h-4 w-4" />
              </a>
            )}

            {plugin.file.html_url && (
              <a
                href={plugin.file.html_url}
                target="_blank"
                rel="noopener noreferrer"
                title="View Source Code"
                className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 
                       text-white rounded-lg transition-all duration-200 hover:scale-105"
              >
                <Eye className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }
);
