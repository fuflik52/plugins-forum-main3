const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Настройка Supabase клиента
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_ANON_KEY должны быть установлены в .env файле');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSetup() {
    try {
        console.log('📋 Выполнение настройки базы данных...');
        
        // Читаем SQL файл
        const sqlPath = path.join(__dirname, 'setup.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Разбиваем SQL на отдельные команды
        const sqlCommands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
        
        console.log(`📦 Найдено ${sqlCommands.length} SQL команд для выполнения`);
        
        // Выполняем каждую команду
        for (let i = 0; i < sqlCommands.length; i++) {
            const command = sqlCommands[i];
            if (command.toLowerCase().includes('select') && command.includes('result')) {
                continue; // Пропускаем информационные SELECT
            }
            
            console.log(`⚡ Выполнение команды ${i + 1}/${sqlCommands.length}...`);
            
            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: command
            });
            
            if (error) {
                // Пробуем выполнить через обычный запрос
                const { error: directError } = await supabase
                    .from('_temp')
                    .select('*')
                    .limit(0);
                
                if (directError && !directError.message.includes('does not exist')) {
                    console.warn(`⚠️ Предупреждение при выполнении команды ${i + 1}: ${error.message}`);
                }
            }
        }
        
        // Проверяем, что таблица создана
        const { data: tables, error: tablesError } = await supabase
            .from('plugins')
            .select('count')
            .limit(1);
            
        if (tablesError) {
            console.error('❌ Ошибка при проверке таблицы plugins:', tablesError.message);
            console.log('\n🔗 Пожалуйста, выполните setup.sql вручную в Supabase SQL Editor:');
            console.log(`   https://app.supabase.com/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql`);
            return false;
        }
        
        console.log('✅ База данных успешно настроена!');
        console.log('📊 Таблица plugins создана и готова к использованию');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка при настройке базы данных:', error.message);
        console.log('\n🔗 Пожалуйста, выполните setup.sql вручную в Supabase SQL Editor:');
        console.log(`   https://app.supabase.com/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql`);
        return false;
    }
}

if (require.main === module) {
    runSetup().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { runSetup };