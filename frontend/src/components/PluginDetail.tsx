import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { IndexedPlugin, PluginIndex } from "../types/plugin";
import { ApiService } from "../services/api";
import { CodeHighlight } from "./CodeHighlight";
import { PluginAnalyzer, type PluginAnalysis } from "../utils/pluginAnalyzer";
import {
  Star,
  GitFork,
  AlertCircle,
  User,
  Github,
  Eye,
  ArrowLeft,
  ExternalLink,
  Download,
  Clock,
  Code,
  FileText,
  Users,
  RefreshCw,
  Terminal,
  Shield,
  Zap,
  Package2,
  Settings,
  Info as InfoIcon,
} from "lucide-react";

export const PluginDetail: React.FC = () => {
  const { pluginId } = useParams<{ pluginId: string }>();
  const navigate = useNavigate();
  const [pluginIndex, setPluginIndex] = useState<PluginIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pluginAnalysis, setPluginAnalysis] = useState<PluginAnalysis | null>(
    null
  );

  useEffect(() => {
    void loadPlugins();
  }, []);

  // Найдем плагин по ID (используем индекс в массиве как ID)
  const plugin: IndexedPlugin | undefined =
    pluginIndex?.items[parseInt(pluginId || "0", 10)];

  // Загружаем содержимое файла когда плагин загружен
  useEffect(() => {
    if (plugin && plugin.file.html_url && !fileContent && !fileLoading) {
      void loadFileContent(plugin);
    }
  }, [plugin, fileContent, fileLoading]);

  const loadPlugins = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.fetchPluginIndex();
      setPluginIndex(data);
    } catch (err) {
      setError("Failed to load plugin data");
      console.error("Error loading plugins:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async (plugin: IndexedPlugin): Promise<void> => {
    if (!plugin.file.html_url) return;

    try {
      setFileLoading(true);
      setFileError(null);

      // Преобразуем URL из GitHub blob в raw URL для получения содержимого
      const rawUrl = plugin.file.html_url.replace("/blob/", "/raw/");

      // Используем публичный CORS прокси для избежания CORS проблем
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const content = await response.text();
      setFileContent(content);

      // Анализируем содержимое плагина
      const analysis = await PluginAnalyzer.analyzePlugin(content);
      setPluginAnalysis(analysis);
    } catch (err) {
      setFileError("Не удалось загрузить содержимое файла");
      console.error("Error loading file content:", err);
    } finally {
      setFileLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Неизвестно";
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Неизвестно";
    }
  };

  const formatNumber = (num: number | undefined): string => {
    if (!num) return "0";
    if (num > 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num > 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <RefreshCw className="h-16 w-16 text-blue-600 animate-spin mx-auto" />
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse opacity-30"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Загружаем данные
            </h2>
            <p className="text-gray-600">Получаем информацию о плагине...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plugin || !plugin.repository || !plugin.file) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              void navigate("/");
            }}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к списку
          </button>

          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Плагин не найден
            </h1>
            <p className="text-gray-600">
              Запрашиваемый плагин не существует или произошла ошибка загрузки.
            </p>
            {error && <p className="text-red-600 mt-2">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              void navigate("/");
            }}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к списку
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Info Panel */}
          <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
            {/* Plugin Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {plugin.plugin_name || "Unnamed Plugin"}
                    </h1>
                    {plugin.plugin_version && (
                      <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-800 rounded-full">
                        v{plugin.plugin_version}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center text-gray-600 mb-3">
                    <User className="h-4 w-4 mr-2" />
                    <span className="font-medium">
                      {plugin.plugin_author ||
                        plugin.repository.owner_login ||
                        "Unknown Author"}
                    </span>
                  </div>

                  {plugin.plugin_description && (
                    <p className="text-gray-700 text-lg leading-relaxed">
                      {plugin.plugin_description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
                    <Code className="h-3 w-3 mr-1" />
                    C#
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                {plugin.repository.html_url && (
                  <a
                    href={plugin.repository.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <Github className="h-4 w-4" />
                    Репозиторий
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {plugin.file.html_url && (
                  <a
                    href={plugin.file.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <Eye className="h-4 w-4" />
                    Исходный код
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {plugin.file.html_url && (
                  <a
                    href={plugin.file.html_url.replace("/blob/", "/raw/")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <Download className="h-4 w-4" />
                    Скачать
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Plugin Analysis */}
            {pluginAnalysis && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <InfoIcon className="h-5 w-5" />
                  Анализ плагина
                </h2>

                <div className="space-y-4">
                  {/* Commands */}
                  {(pluginAnalysis.commands.chatCommands.length > 0 ||
                    pluginAnalysis.commands.consoleCommands.length > 0) && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Terminal className="h-4 w-4 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">Команды</h3>
                        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                          {pluginAnalysis.commands.chatCommands.length +
                            pluginAnalysis.commands.consoleCommands.length}
                        </span>
                      </div>

                      {pluginAnalysis.commands.chatCommands.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-blue-700 mb-2">
                            Чат команды (
                            {pluginAnalysis.commands.chatCommands.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {pluginAnalysis.commands.chatCommands.map(
                              (cmd, idx) => (
                                <span
                                  key={idx}
                                  className="bg-white px-2 py-1 rounded text-xs font-mono text-gray-700 border border-blue-200"
                                >
                                  /{cmd}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {pluginAnalysis.commands.consoleCommands.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-blue-700 mb-2">
                            Консольные команды (
                            {pluginAnalysis.commands.consoleCommands.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {pluginAnalysis.commands.consoleCommands.map(
                              (cmd, idx) => (
                                <span
                                  key={idx}
                                  className="bg-white px-2 py-1 rounded text-xs font-mono text-gray-700 border border-blue-200"
                                >
                                  {cmd}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Permissions */}
                  {pluginAnalysis.permissions.registered.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4 text-green-600" />
                        <h3 className="font-semibold text-green-900">
                          Права доступа
                        </h3>
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                          {pluginAnalysis.permissions.registered.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pluginAnalysis.permissions.registered.map(
                          (perm, idx) => (
                            <span
                              key={idx}
                              className="bg-white px-2 py-1 rounded text-xs font-mono text-gray-700 border border-green-200 break-all"
                            >
                              {perm}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hooks */}
                  {pluginAnalysis.hooks.oxideHooks.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-4 w-4 text-purple-600" />
                        <h3 className="font-semibold text-purple-900">
                          Oxide хуки
                        </h3>
                        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                          {pluginAnalysis.hooks.oxideHooks.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pluginAnalysis.hooks.oxideHooks.map((hook, idx) => (
                          <span
                            key={idx}
                            className="bg-white px-2 py-1 rounded text-xs font-mono text-gray-700 border border-purple-200"
                          >
                            {hook}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dependencies & Config */}
                  {(pluginAnalysis.dependencies.pluginReferences.length > 0 ||
                    pluginAnalysis.config.hasDefaultConfig) && (
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Package2 className="h-4 w-4 text-orange-600" />
                        <h3 className="font-semibold text-orange-900">
                          Зависимости и конфигурация
                        </h3>
                      </div>

                      {pluginAnalysis.dependencies.pluginReferences.length >
                        0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-orange-700 mb-2">
                            Зависимости от плагинов (
                            {
                              pluginAnalysis.dependencies.pluginReferences
                                .length
                            }
                            )
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {pluginAnalysis.dependencies.pluginReferences.map(
                              (dep, idx) => (
                                <span
                                  key={idx}
                                  className="bg-white px-2 py-1 rounded text-xs font-mono text-gray-700 border border-orange-200"
                                >
                                  {dep}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {pluginAnalysis.config.hasDefaultConfig && (
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-orange-600" />
                          <span className="text-sm text-orange-700 font-medium">
                            Имеет конфигурационный файл
                          </span>
                          {pluginAnalysis.config.configKeys.length > 0 && (
                            <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                              {pluginAnalysis.config.configKeys.length}{" "}
                              параметров
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* File Content */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm w-full">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Code className="h-5 w-5" />
                Содержимое файла
              </h2>

              {fileLoading && (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mr-2" />
                  <span className="text-gray-600">
                    Загружаем содержимое файла...
                  </span>
                </div>
              )}

              {fileError && (
                <div className="flex items-center justify-center p-8 bg-red-50 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
                  <span className="text-red-600">{fileError}</span>
                  <button
                    onClick={() => void loadFileContent(plugin)}
                    className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Попробовать снова
                  </button>
                </div>
              )}

              {fileContent && !fileLoading && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Строк: {fileContent.split("\n").length} | Символов:{" "}
                      {fileContent.length.toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          void (async (): Promise<void> => {
                            try {
                              await navigator.clipboard.writeText(fileContent);
                              // Можно добавить уведомление об успешном копировании
                            } catch (err) {
                              console.error("Failed to copy:", err);
                            }
                          })();
                        }}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded transition-colors"
                      >
                        Копировать
                      </button>
                      <a
                        href={plugin.file.html_url?.replace("/blob/", "/raw/")}
                        download={plugin.file.path?.split("/").pop()}
                        className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded transition-colors"
                      >
                        Скачать
                      </a>
                    </div>
                  </div>

                  <div className="relative w-full">
                    <CodeHighlight
                      code={fileContent}
                      language="csharp"
                      className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto text-sm leading-relaxed max-h-[600px] overflow-y-auto custom-scrollbar-dark w-full min-w-0"
                    />
                  </div>
                </div>
              )}

              {!fileContent &&
                !fileLoading &&
                !fileError &&
                plugin.file.html_url && (
                  <div className="flex items-center justify-center p-8">
                    <button
                      onClick={() => void loadFileContent(plugin)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Загрузить содержимое файла
                    </button>
                  </div>
                )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 order-1 lg:order-2">
            {/* Repository Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Github className="h-4 w-4" />
                Репозиторий
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">
                    {plugin.repository.full_name}
                  </h3>
                  {plugin.repository.description && (
                    <p className="text-gray-600 leading-relaxed text-xs">
                      {plugin.repository.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Star className="h-3 w-3 text-yellow-500 mr-1" />
                      <span className="font-semibold text-sm">
                        {formatNumber(plugin.repository.stargazers_count)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Звезды</span>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <GitFork className="h-3 w-3 text-green-500 mr-1" />
                      <span className="font-semibold text-sm">
                        {formatNumber(plugin.repository.forks_count)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Форки</span>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                      <span className="font-semibold text-sm">
                        {formatNumber(plugin.repository.open_issues_count)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Проблемы</span>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Users className="h-3 w-3 text-blue-500 mr-1" />
                      <span className="font-semibold text-sm">
                        {formatNumber(plugin.repository.stargazers_count || 0)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Подписчики</span>
                  </div>
                </div>
              </div>
            </div>

            {/* File Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Файл
              </h2>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">
                    Путь к файлу:
                  </div>
                  <div className="font-mono text-xs text-gray-900 break-all">
                    {plugin.file.path}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">
                    Размер файла:
                  </div>
                  <div className="text-xs text-gray-900">
                    {fileContent
                      ? `${(fileContent.length / 1024).toFixed(1)} KB`
                      : "Неизвестно"}
                  </div>
                </div>

                {plugin.file.sha && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">SHA:</div>
                    <div className="font-mono text-xs text-gray-900">
                      {plugin.file.sha.substring(0, 12)}...
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Временная шкала
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Последний коммит
                    </div>
                    <div className="text-xs text-gray-500">
                      {plugin.commits && plugin.commits.latest
                        ? formatDate(plugin.commits.latest.committed_at)
                        : "Неизвестно"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Создан
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(plugin.repository.created_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Обновлен
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(plugin.repository.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Language */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Язык программирования
              </h2>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">
                  {plugin.language || "C#"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
