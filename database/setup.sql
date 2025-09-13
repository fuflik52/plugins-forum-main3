-- 🗄️ Автоматическая настройка базы данных Supabase для проекта плагинов
-- Выполните этот скрипт в SQL Editor вашего Supabase проекта

-- Создание таблицы plugins
CREATE TABLE IF NOT EXISTS public.plugins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    size BIGINT DEFAULT 0,
    author VARCHAR(255),
    version VARCHAR(50),
    github_url TEXT,
    download_url TEXT,
    tags TEXT[],
    category VARCHAR(100),
    language VARCHAR(50),
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    download_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    metadata JSONB DEFAULT '{}'
);

-- Создание индексов для оптимизации поиска
CREATE INDEX IF NOT EXISTS idx_plugins_name ON public.plugins(name);
CREATE INDEX IF NOT EXISTS idx_plugins_category ON public.plugins(category);
CREATE INDEX IF NOT EXISTS idx_plugins_language ON public.plugins(language);
CREATE INDEX IF NOT EXISTS idx_plugins_stars ON public.plugins(stars DESC);
CREATE INDEX IF NOT EXISTS idx_plugins_updated ON public.plugins(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_plugins_active ON public.plugins(is_active);
CREATE INDEX IF NOT EXISTS idx_plugins_tags ON public.plugins USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_plugins_search ON public.plugins USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_plugins_updated_at ON public.plugins;
CREATE TRIGGER update_plugins_updated_at
    BEFORE UPDATE ON public.plugins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Функция для автозаполнения данных плагинов из JSON
CREATE OR REPLACE FUNCTION auto_populate_plugins(plugins_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    plugin_record JSONB;
    inserted_count INTEGER := 0;
BEGIN
    -- Проходим по каждому плагину в JSON массиве
    FOR plugin_record IN SELECT * FROM jsonb_array_elements(plugins_data)
    LOOP
        -- Вставляем или обновляем плагин
        INSERT INTO public.plugins (
            name,
            description,
            size,
            author,
            version,
            github_url,
            download_url,
            tags,
            category,
            language,
            stars,
            forks,
            metadata
        ) VALUES (
            plugin_record->>'name',
            plugin_record->>'description',
            COALESCE((plugin_record->>'size')::BIGINT, 0),
            plugin_record->>'author',
            plugin_record->>'version',
            plugin_record->>'github_url',
            plugin_record->>'download_url',
            CASE 
                WHEN plugin_record->'tags' IS NOT NULL 
                THEN ARRAY(SELECT jsonb_array_elements_text(plugin_record->'tags'))
                ELSE ARRAY[]::TEXT[]
            END,
            plugin_record->>'category',
            plugin_record->>'language',
            COALESCE((plugin_record->>'stars')::INTEGER, 0),
            COALESCE((plugin_record->>'forks')::INTEGER, 0),
            plugin_record
        )
        ON CONFLICT (name) 
        DO UPDATE SET
            description = EXCLUDED.description,
            size = EXCLUDED.size,
            author = EXCLUDED.author,
            version = EXCLUDED.version,
            github_url = EXCLUDED.github_url,
            download_url = EXCLUDED.download_url,
            tags = EXCLUDED.tags,
            category = EXCLUDED.category,
            language = EXCLUDED.language,
            stars = EXCLUDED.stars,
            forks = EXCLUDED.forks,
            metadata = EXCLUDED.metadata,
            updated_at = NOW();
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики плагинов
CREATE OR REPLACE FUNCTION get_plugins_stats()
RETURNS TABLE(
    total_plugins INTEGER,
    active_plugins INTEGER,
    total_categories INTEGER,
    total_languages INTEGER,
    avg_stars DECIMAL,
    last_update TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_plugins,
        COUNT(*) FILTER (WHERE is_active = true)::INTEGER as active_plugins,
        COUNT(DISTINCT category)::INTEGER as total_categories,
        COUNT(DISTINCT language)::INTEGER as total_languages,
        ROUND(AVG(stars), 2) as avg_stars,
        MAX(updated_at) as last_update
    FROM public.plugins;
END;
$$ LANGUAGE plpgsql;

-- Функция для поиска плагинов
CREATE OR REPLACE FUNCTION search_plugins(
    search_term TEXT DEFAULT '',
    category_filter TEXT DEFAULT NULL,
    language_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    name VARCHAR,
    description TEXT,
    author VARCHAR,
    category VARCHAR,
    language VARCHAR,
    stars INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.author,
        p.category,
        p.language,
        p.stars,
        p.last_updated,
        ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('english', search_term)) as rank
    FROM public.plugins p
    WHERE 
        p.is_active = true
        AND (search_term = '' OR to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', search_term))
        AND (category_filter IS NULL OR p.category = category_filter)
        AND (language_filter IS NULL OR p.language = language_filter)
    ORDER BY 
        CASE WHEN search_term = '' THEN p.stars ELSE NULL END DESC,
        CASE WHEN search_term != '' THEN ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('english', search_term)) ELSE NULL END DESC,
        p.last_updated DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Включение Row Level Security (RLS)
ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (все могут читать активные плагины)
CREATE POLICY "Allow public read access" ON public.plugins
    FOR SELECT USING (is_active = true);

-- Политика для вставки (только аутентифицированные пользователи)
CREATE POLICY "Allow authenticated insert" ON public.plugins
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Политика для обновления (только аутентифицированные пользователи)
CREATE POLICY "Allow authenticated update" ON public.plugins
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Создание представления для публичного API
CREATE OR REPLACE VIEW public.plugins_public AS
SELECT 
    id,
    name,
    description,
    size,
    author,
    version,
    github_url,
    download_url,
    tags,
    category,
    language,
    stars,
    forks,
    last_updated,
    created_at,
    download_count,
    rating
FROM public.plugins
WHERE is_active = true;

-- Предоставление доступа к представлению
GRANT SELECT ON public.plugins_public TO anon;
GRANT SELECT ON public.plugins_public TO authenticated;

-- Создание функции для инкремента счетчика загрузок
CREATE OR REPLACE FUNCTION increment_download_count(plugin_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.plugins 
    SET download_count = download_count + 1,
        updated_at = NOW()
    WHERE id = plugin_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Предоставление доступа к функции инкремента
GRANT EXECUTE ON FUNCTION increment_download_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_download_count(UUID) TO authenticated;

-- Вставка тестовых данных (опционально)
INSERT INTO public.plugins (name, description, author, category, language, stars, github_url) VALUES
('Example Plugin', 'Пример плагина для демонстрации', 'TestAuthor', 'Utility', 'C#', 42, 'https://github.com/example/plugin')
ON CONFLICT (name) DO NOTHING;

-- Вывод результата настройки
SELECT 'База данных успешно настроена! Таблица plugins создана с индексами, функциями и политиками безопасности.' as result;

-- Показать статистику
SELECT * FROM get_plugins_stats();