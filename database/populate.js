#!/usr/bin/env node

/**
 * 🚀 Скрипт автоматического заполнения базы данных Supabase
 * Загружает данные плагинов из JSON файлов и отправляет в Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Конфигурация Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Используем SERVICE_ROLE_KEY для обхода RLS политик при заполнении данных
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY (или SUPABASE_ANON_KEY) должны быть установлены в .env файле');
    process.exit(1);
}

if (!supabaseServiceKey) {
    console.warn('⚠️  Предупреждение: SUPABASE_SERVICE_ROLE_KEY не установлен. Используется ANON_KEY, что может вызвать ошибки RLS.');
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log(`🔑 Используется ${supabaseServiceKey ? 'SERVICE_ROLE_KEY' : 'ANON_KEY'} для подключения к Supabase`);

// Пути к JSON файлам с данными плагинов
const dataFiles = [
    '../backend/output/crawled_plugins.json',
    '../backend/output/oxide_plugins.json'
];

/**
 * Нормализация данных плагина
 */
function normalizePlugin(plugin) {
    return {
        name: plugin.plugin_name || plugin.name || plugin.title || 'Unknown Plugin',
        description: plugin.plugin_description || plugin.description || plugin.summary || (plugin.repository ? plugin.repository.description : '') || '',
        size: parseInt(plugin.size) || 0,
        author: plugin.plugin_author || plugin.author || plugin.owner || (plugin.repository ? plugin.repository.owner_login : '') || 'Unknown',
        version: plugin.plugin_version || plugin.version || '1.0.0',
        github_url: plugin.github_url || plugin.url || (plugin.repository ? plugin.repository.html_url : '') || '',
        download_url: plugin.download_url || plugin.downloadUrl || (plugin.file ? plugin.file.raw_url : '') || '',
        tags: Array.isArray(plugin.tags) ? plugin.tags : (plugin.tags ? [plugin.tags] : []),
        category: plugin.category || plugin.type || 'Plugin',
        language: plugin.language || plugin.programmingLanguage || 'C#',
        stars: parseInt(plugin.stars) || parseInt(plugin.stargazers_count) || (plugin.repository ? parseInt(plugin.repository.stargazers_count) : 0) || 0,
        forks: parseInt(plugin.forks) || parseInt(plugin.forks_count) || (plugin.repository ? parseInt(plugin.repository.forks_count) : 0) || 0,
        metadata: {
            original_data: plugin,
            source_file: plugin._source_file || 'unknown',
            imported_at: new Date().toISOString()
        }
    };
}

/**
 * Загрузка данных из JSON файла
 */
function loadPluginsFromFile(filePath) {
    try {
        const fullPath = path.resolve(__dirname, filePath);
        if (!fs.existsSync(fullPath)) {
            console.warn(`⚠️  Файл не найден: ${fullPath}`);
            return [];
        }

        const data = fs.readFileSync(fullPath, 'utf8');
        const parsed = JSON.parse(data);
        
        // Обработка различных форматов JSON
        let plugins = [];
        if (Array.isArray(parsed)) {
            plugins = parsed;
        } else if (parsed.plugins && Array.isArray(parsed.plugins)) {
            plugins = parsed.plugins;
        } else if (parsed.data && Array.isArray(parsed.data)) {
            plugins = parsed.data;
        } else if (parsed.items && Array.isArray(parsed.items)) {
            plugins = parsed.items;
        } else {
            console.warn(`⚠️  Неизвестный формат данных в файле: ${filePath}`);
            return [];
        }

        // Добавляем информацию об источнике
        plugins.forEach(plugin => {
            plugin._source_file = path.basename(filePath);
        });

        console.log(`✅ Загружено ${plugins.length} плагинов из ${filePath}`);
        return plugins;
    } catch (error) {
        console.error(`❌ Ошибка при загрузке файла ${filePath}:`, error.message);
        return [];
    }
}

/**
 * Загрузка плагинов в базу данных пакетами
 */
async function uploadPluginsBatch(plugins, batchSize = 50) {
    const totalBatches = Math.ceil(plugins.length / batchSize);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, plugins.length);
        const batch = plugins.slice(start, end);

        console.log(`📦 Обработка пакета ${i + 1}/${totalBatches} (${batch.length} плагинов)...`);

        try {
            const { data, error } = await supabase
                .from('plugins')
                .upsert(batch, { 
                    onConflict: 'name',
                    ignoreDuplicates: false 
                });

            if (error) {
                console.error(`❌ Ошибка в пакете ${i + 1}:`, error.message);
                errorCount += batch.length;
            } else {
                console.log(`✅ Пакет ${i + 1} успешно загружен`);
                successCount += batch.length;
            }
        } catch (error) {
            console.error(`❌ Критическая ошибка в пакете ${i + 1}:`, error.message);
            errorCount += batch.length;
        }

        // Небольшая пауза между пакетами
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { successCount, errorCount };
}

/**
 * Получение статистики базы данных
 */
async function getDatabaseStats() {
    try {
        const { data, error } = await supabase
            .rpc('get_plugins_stats');

        if (error) {
            console.error('❌ Ошибка получения статистики:', error.message);
            return null;
        }

        return data[0];
    } catch (error) {
        console.error('❌ Критическая ошибка получения статистики:', error.message);
        return null;
    }
}

/**
 * Основная функция
 */
async function main() {
    console.log('🚀 Начинаем автоматическое заполнение базы данных Supabase...');
    console.log('=' .repeat(60));

    // Проверка подключения к Supabase
    try {
        const { data, error } = await supabase
            .from('plugins')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Ошибка подключения к Supabase:', error.message);
            console.log('💡 Убедитесь что:');
            console.log('   1. Выполнен SQL скрипт setup.sql в Supabase');
            console.log('   2. Правильно настроены SUPABASE_URL и SUPABASE_ANON_KEY');
            console.log('   3. Включены правильные политики RLS');
            process.exit(1);
        }
        
        console.log(`✅ Подключение к Supabase успешно (текущее количество плагинов: ${data || 0})`);
    } catch (error) {
        console.error('❌ Критическая ошибка подключения:', error.message);
        process.exit(1);
    }

    // Загрузка всех плагинов из файлов
    let allPlugins = [];
    for (const filePath of dataFiles) {
        const plugins = loadPluginsFromFile(filePath);
        allPlugins = allPlugins.concat(plugins);
    }

    if (allPlugins.length === 0) {
        console.log('⚠️  Не найдено плагинов для загрузки');
        process.exit(0);
    }

    console.log(`📊 Всего найдено плагинов: ${allPlugins.length}`);

    // Нормализация данных
    console.log('🔄 Нормализация данных...');
    const normalizedPlugins = allPlugins.map(normalizePlugin);
    
    // Удаление дубликатов по имени
    const uniquePlugins = normalizedPlugins.reduce((acc, plugin) => {
        if (!acc.find(p => p.name === plugin.name)) {
            acc.push(plugin);
        }
        return acc;
    }, []);

    console.log(`🎯 Уникальных плагинов после обработки: ${uniquePlugins.length}`);

    // Загрузка в базу данных
    console.log('📤 Начинаем загрузку в базу данных...');
    const { successCount, errorCount } = await uploadPluginsBatch(uniquePlugins);

    // Получение финальной статистики
    console.log('\n📈 Получение статистики базы данных...');
    const stats = await getDatabaseStats();

    // Вывод результатов
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 РЕЗУЛЬТАТЫ ИМПОРТА:');
    console.log('=' .repeat(60));
    console.log(`✅ Успешно загружено: ${successCount} плагинов`);
    console.log(`❌ Ошибок при загрузке: ${errorCount} плагинов`);
    
    if (stats) {
        console.log('\n📊 СТАТИСТИКА БАЗЫ ДАННЫХ:');
        console.log(`   Всего плагинов: ${stats.total_plugins}`);
        console.log(`   Активных плагинов: ${stats.active_plugins}`);
        console.log(`   Категорий: ${stats.total_categories}`);
        console.log(`   Языков программирования: ${stats.total_languages}`);
        console.log(`   Средний рейтинг звезд: ${stats.avg_stars}`);
        console.log(`   Последнее обновление: ${new Date(stats.last_update).toLocaleString('ru-RU')}`);
    }

    console.log('\n🚀 База данных готова к использованию!');
    console.log('💡 Теперь вы можете подключить фронтенд к Supabase API');
}

// Обработка ошибок
process.on('unhandledRejection', (error) => {
    console.error('❌ Необработанная ошибка:', error);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});

// Запуск скрипта
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Ошибка выполнения скрипта:', error);
        process.exit(1);
    });
}

module.exports = { normalizePlugin, loadPluginsFromFile, uploadPluginsBatch, getDatabaseStats };