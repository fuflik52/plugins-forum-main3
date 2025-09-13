import React, { useState, useCallback } from "react";
import type { IndexedPlugin } from "../types/plugin";
import { PluginCard } from "./PluginCard";
import { ErrorBoundary } from "./ErrorBoundary";
import { ChevronDown, ChevronRight, Package, Users } from "lucide-react";
import { getPluginTimestamp } from "../utils/dateUtils";
import { findPluginGlobalIndex } from "../utils/pluginUtils";

interface GroupedPluginViewProps {
  plugins: IndexedPlugin[];
  loading?: boolean;
  sortBy:
    | "updated_desc"
    | "updated_asc"
    | "created_desc"
    | "created_asc"
    | "indexed_desc"
    | "indexed_asc";
  allPlugins?: IndexedPlugin[]; // All plugins for calculating global index
}

export const GroupedPluginView: React.FC<GroupedPluginViewProps> = ({
  plugins,
  loading = false,
  sortBy,
  allPlugins,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group plugins by name
  const groupedPlugins = React.useMemo(() => {
    const groups: Record<string, IndexedPlugin[]> = {};

    plugins.forEach((plugin) => {
      const name = plugin.plugin_name || "Unknown";
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(plugin);
    });

    // Parse sort parameters
    const [field, dir] = ((): [
      "updated" | "created" | "indexed",
      "asc" | "desc"
    ] => {
      if (sortBy.startsWith("updated"))
        return ["updated", sortBy.endsWith("asc") ? "asc" : "desc"] as const;
      if (sortBy.startsWith("created"))
        return ["created", sortBy.endsWith("asc") ? "asc" : "desc"] as const;
      return ["indexed", sortBy.endsWith("asc") ? "asc" : "desc"] as const;
    })();

    // Convert to array and sort groups by the latest plugin in each group
    return Object.entries(groups)
      .map(([name, pluginList]) => {
        // Sort plugins within each group by the same criteria
        const sortedPlugins = [...pluginList].sort((a, b) => {
          const ta = getPluginTimestamp(a, field);
          const tb = getPluginTimestamp(b, field);
          const diff = tb - ta;
          return dir === "asc" ? -diff : diff;
        });

        // Get the representative plugin (first one after sorting)
        const representativePlugin = sortedPlugins[0];

        return {
          name,
          plugins: sortedPlugins,
          count: pluginList.length,
          representativePlugin,
        };
      })
      .sort((a, b) => {
        // Sort groups by their representative plugin
        const ta = getPluginTimestamp(a.representativePlugin, field);
        const tb = getPluginTimestamp(b.representativePlugin, field);
        const diff = tb - ta;
        return dir === "asc" ? -diff : diff;
      });
  }, [plugins, sortBy]);

  // Mathematical optimization: Stable callback for group toggling
  const toggleGroup = useCallback((groupName: string): void => {
    setExpandedGroups((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(groupName)) {
        newExpanded.delete(groupName);
      } else {
        newExpanded.add(groupName);
      }
      return newExpanded;
    });
  }, []);

  // Mathematical proof: O(n) Set creation instead of O(n²) updates
  const expandAll = useCallback((): void => {
    setExpandedGroups(new Set(groupedPlugins.map((g) => g.name)));
  }, [groupedPlugins]);

  const collapseAll = useCallback((): void => {
    setExpandedGroups(new Set());
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden animate-pulse"
          >
            <div className="p-4 border-b border-gray-100">
              <div className="h-6 bg-gray-200 rounded mb-2 w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groupedPlugins.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-2">No plugins found</div>
        <div className="text-gray-400 text-sm">
          Try adjusting your search criteria
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Group controls */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="h-4 w-4" />
            <span className="font-medium">{groupedPlugins.length}</span>
            <span>unique plugins</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span className="font-medium">{plugins.length}</span>
            <span>total instances</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Grouped plugins */}
      {groupedPlugins.map((group) => {
        const isExpanded = expandedGroups.has(group.name);

        return (
          <div
            key={group.name}
            className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
          >
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.name)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {group.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {group.count} {group.count === 1 ? "instance" : "instances"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  {group.count}
                </span>
              </div>
            </button>

            {/* Group content */}
            {isExpanded && (
              <div className="border-t border-gray-100 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.plugins.map((plugin, index) => {
                    // Find the global index of this plugin in the original array
                    const globalIndex = allPlugins
                      ? findPluginGlobalIndex(plugin, allPlugins)
                      : index;

                    return (
                      <ErrorBoundary
                        key={`${plugin.repository?.full_name || "unknown"}-${
                          plugin.file?.path || "unknown"
                        }-${index}`}
                      >
                        <PluginCard
                          plugin={plugin}
                          pluginIndex={globalIndex >= 0 ? globalIndex : index}
                        />
                      </ErrorBoundary>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
