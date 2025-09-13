#!/usr/bin/env node

/**
 * 🚀 Автоматический скрипт инициализации Supabase для проекта плагинов
 * Выполняет полную настройку базы данных и интеграции
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Начинаем автоматическую настройку Supabase...');
console.log('=' .repeat(60));

// Функция для выполнения команд
function runCommand(command, cwd = process.cwd()) {
    try {
        console.log(`🔄 Выполняем: ${command}`);
        const result = execSync(command, { 
            cwd, 
            stdio: 'inherit',
            encoding: 'utf8'
        });
        console.log('✅ Команда выполнена успешно\n');
        return true;
    } catch (error) {
        console.error(`❌ Ошибка выполнения команды: ${command}`);
        console.error(error.message);
        return false;
    }
}

// Функция для проверки существования файла
function fileExists(filePath) {
    return fs.existsSync(path.resolve(filePath));
}

// Функция для создания .env файла из примера
function createEnvFromExample(examplePath, envPath) {
    if (!fileExists(envPath) && fileExists(examplePath)) {
        try {
            fs.copyFileSync(examplePath, envPath);
            console.log(`✅ Создан файл ${envPath} из примера`);
            return true;
        } catch (error) {
            console.error(`❌ Ошибка создания ${envPath}:`, error.message);
            return false;
        }
    }
    return false;
}

async function main() {
    console.log('📋 ШАГ 1: Проверка структуры проекта');
    console.log('-' .repeat(40));
    
    // Проверяем наличие необходимых директорий
    const requiredDirs = ['frontend', 'database', 'backend'];
    for (const dir of requiredDirs) {
        if (fileExists(dir)) {
            console.log(`✅ Директория ${dir} найдена`);
        } else {
            console.log(`⚠️  Директория ${dir} не найдена`);
        }
    }
    
    console.log('\n📦 ШАГ 2: Установка зависимостей');
    console.log('-' .repeat(40));
    
    // Установка зависимостей для database
    if (fileExists('database/package.json')) {
        console.log('🔄 Устанавливаем зависимости для database...');
        if (!runCommand('npm install', 'database')) {
            console.error('❌ Не удалось установить зависимости для database');
        }
    }
    
    // Установка зависимостей для frontend
    if (fileExists('frontend/package.json')) {
        console.log('🔄 Устанавливаем зависимости для frontend...');
        if (!runCommand('npm install', 'frontend')) {
            console.error('❌ Не удалось установить зависимости для frontend');
        }
    }
    
    console.log('\n🔧 ШАГ 3: Настройка переменных окружения');
    console.log('-' .repeat(40));
    
    // Создание .env файлов из примеров
    createEnvFromExample('database/.env.example', 'database/.env');
    createEnvFromExample('frontend/.env.example', 'frontend/.env');
    
    console.log('\n📄 ШАГ 4: Инструкции по настройке Supabase');
    console.log('-' .repeat(40));
    
    console.log('🔗 Для завершения настройки выполните следующие шаги:');
    console.log('');
    console.log('1️⃣  Создайте проект в Supabase:');
    console.log('   https://app.supabase.com/');
    console.log('');
    console.log('2️⃣  Скопируйте URL и API ключи из Settings > API');
    console.log('');
    console.log('3️⃣  Заполните файлы .env:');
    console.log('   - database/.env (для Node.js скриптов)');
    console.log('   - frontend/.env (для React приложения)');
    console.log('');
    console.log('4️⃣  Выполните SQL скрипт в Supabase SQL Editor:');
    console.log('   - Откройте: https://app.supabase.com/project/YOUR_PROJECT_ID/sql');
    console.log('   - Скопируйте содержимое файла: database/setup.sql');
    console.log('   - Выполните скрипт');
    console.log('');
    console.log('5️⃣  Заполните базу данных:');
    console.log('   cd database && npm run populate');
    console.log('');
    console.log('6️⃣  Запустите фронтенд:');
    console.log('   cd frontend && npm run dev');
    console.log('');
    
    console.log('\n📚 ШАГ 5: Полезные команды');
    console.log('-' .repeat(40));
    console.log('Database команды:');
    console.log('  cd database && npm run help     - Показать все команды');
    console.log('  cd database && npm run check-env - Проверить .env');
    console.log('  cd database && npm run populate  - Заполнить БД');
    console.log('');
    console.log('Frontend команды:');
    console.log('  cd frontend && npm run dev       - Запуск dev сервера');
    console.log('  cd frontend && npm run build     - Сборка проекта');
    console.log('');
    
    console.log('\n🎯 ШАГ 6: Проверка готовности');
    console.log('-' .repeat(40));
    
    const checks = [
        { name: 'SQL скрипт', path: 'database/setup.sql', status: fileExists('database/setup.sql') },
        { name: 'Node.js скрипт', path: 'database/populate.js', status: fileExists('database/populate.js') },
        { name: 'TypeScript сервис', path: 'frontend/src/services/supabaseService.ts', status: fileExists('frontend/src/services/supabaseService.ts') },
        { name: 'Database package.json', path: 'database/package.json', status: fileExists('database/package.json') },
        { name: 'Frontend .env example', path: 'frontend/.env.example', status: fileExists('frontend/.env.example') },
        { name: 'Database .env example', path: 'database/.env.example', status: fileExists('database/.env.example') }
    ];
    
    let allReady = true;
    for (const check of checks) {
        const icon = check.status ? '✅' : '❌';
        console.log(`${icon} ${check.name}: ${check.path}`);
        if (!check.status) allReady = false;
    }
    
    console.log('\n' + '=' .repeat(60));
    if (allReady) {
        console.log('🎉 ВСЕ ГОТОВО! Supabase интеграция настроена.');
        console.log('📋 Следуйте инструкциям выше для завершения настройки.');
    } else {
        console.log('⚠️  Некоторые файлы отсутствуют. Проверьте настройку.');
    }
    console.log('=' .repeat(60));
    
    console.log('\n💡 Дополнительная информация:');
    console.log('📖 Документация Supabase: https://supabase.com/docs');
    console.log('🔧 TypeScript клиент: https://supabase.com/docs/reference/javascript');
    console.log('🗄️  SQL функции: https://supabase.com/docs/guides/database/functions');
    console.log('');
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

module.exports = { main };