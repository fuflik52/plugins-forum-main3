# 🗺️ Roadmap - Oxide Plugins Search System

## 📋 Current Status
- ✅ **Phase 1 Complete**: Basic repository crawler with metadata extraction
- ✅ **Infrastructure**: Incremental crawling, state management, TypeScript strict mode
- ✅ **Data Collection**: Plugin name, author, version, description, resource ID from Info attributes
- ✅ **Output Format**: Compatible with oxide_plugins.json structure

---

## 🎯 Phase 2: Advanced Code Analysis (Next Priority)

### 2.1 Command Parsing
- [x] **Chat Commands**: `[ChatCommand("tp")]`, `[ChatCommand("home")]`
- [x] **Console Commands**: `[ConsoleCommand("server.restart")]`
- [ ] **Dynamic Commands**: Commands registered programmatically
- [ ] **Command Aliases**: Multiple commands pointing to same method

### 2.2 Permissions System
- [ ] **RegisterPermission Calls**: `permission.RegisterPermission(UsePermission, this)`
- [ ] **Permission Constants**: `const string UsePermission = "plugin.use"`
- [ ] **Permission Checks**: `permission.UserHasPermission(userId, perm)`
- [ ] **Permission Hierarchy**: Admin/user permission relationships

### 2.3 Hook Detection
- [x] **Oxide Hooks**: `OnPlayerConnected`, `OnEntityKill`, `OnPlayerChat`
- [ ] **Hook Parameters**: Method signatures and parameter types
- [ ] **Hook Categories**: Player, Entity, Server, Economy hooks
- [ ] **Custom Hooks**: Plugin-specific hook definitions

### 2.4 Plugin Dependencies
- [x] **PluginReference Attributes**: `[PluginReference("Economics")]`
- [x] **PluginReference Fields**: `[PluginReference] Plugin Kits;`
- [ ] **Dynamic Loading**: `plugins.Find("PluginName")`
- [ ] **Dependency Graph**: Plugin interdependency mapping

---

## 🔧 Phase 3: Technical Infrastructure

### 3.1 Parser Architecture
- [ ] **Roslyn Integration**: C# AST parsing with Microsoft.CodeAnalysis
- [ ] **Performance Optimization**: Parallel processing, caching
- [ ] **Error Handling**: Robust parsing with fallback strategies
- [ ] **Memory Management**: Efficient processing of large codebases

### 3.2 Code Analysis Tools
- [ ] **Syntax Tree Analysis**: Full AST traversal
- [ ] **Symbol Resolution**: Type and method resolution
- [ ] **Control Flow Analysis**: Method call graphs
- [ ] **Pattern Recognition**: Common plugin patterns detection

### 3.3 Data Processing Pipeline
- [ ] **Incremental Updates**: Process only changed files
- [ ] **Batch Processing**: Efficient bulk analysis
- [ ] **Progress Tracking**: Real-time analysis progress
- [ ] **Result Caching**: Cache analysis results for performance

---

## 🛡️ Phase 4: Security & Quality Analysis

### 4.1 Vulnerability Detection
- [ ] **SQL Injection**: Unsafe database queries
- [ ] **XSS Prevention**: User input validation
- [ ] **DoS Vectors**: Performance-critical code paths
- [ ] **Unsafe API Usage**: Deprecated or dangerous method calls

### 4.2 Code Quality Metrics
- [ ] **Complexity Analysis**: Cyclomatic complexity scoring
- [ ] **Code Smells**: Anti-pattern detection
- [ ] **Performance Issues**: Inefficient code patterns
- [ ] **Best Practices**: Oxide plugin conventions compliance

### 4.3 Compatibility Checking
- [ ] **Oxide Version**: Target Oxide version detection
- [ ] **API Compatibility**: Deprecated API usage
- [ ] **Dependency Conflicts**: Version mismatch detection
- [ ] **Breaking Changes**: Impact assessment

---

## 🔍 Phase 5: Enhanced Search Features

### 5.1 Advanced Metadata Extraction
- [ ] **Configuration Files**: Parse plugin config structures
- [ ] **Language Files**: Multi-language support detection  
- [ ] **Documentation**: README.md, inline documentation
- [ ] **License Information**: License type and compatibility

### 5.2 Content Analysis
- [ ] **Feature Detection**: Economy, PvP, Building, etc.
- [ ] **Game Integration**: Rust-specific API usage
- [ ] **UI Components**: GUI, HUD, Chat interface usage
- [ ] **Database Usage**: Data storage patterns

### 5.3 Repository Intelligence
- [ ] **GitHub Stats**: Stars, forks, issues, last activity
- [ ] **Contributor Analysis**: Author contributions, expertise areas
- [ ] **Release Management**: Version history, changelog analysis
- [ ] **Community Engagement**: Issue response times, documentation quality

---

## 📊 Phase 6: Search System Integration

### 6.1 Search Engine Backend
- [ ] **Elasticsearch Integration**: Full-text search with complex queries
- [ ] **Search Indexing**: Optimized indexing for all metadata fields
- [ ] **Query DSL**: Advanced search query language
- [ ] **Faceted Search**: Filter by commands, hooks, permissions, etc.

### 6.2 API Development
- [ ] **REST API**: RESTful endpoints for plugin search
- [ ] **GraphQL API**: Flexible query interface
- [ ] **Real-time Updates**: WebSocket for live search results
- [ ] **Rate Limiting**: API usage control and throttling

### 6.3 Frontend Features
- [ ] **Advanced Filters**: Multi-criteria search interface
- [ ] **Plugin Comparison**: Side-by-side plugin analysis
- [ ] **Dependency Visualization**: Interactive dependency graphs
- [ ] **Code Preview**: Inline code viewing with syntax highlighting

---

## 🚀 Phase 7: Platform Features

### 7.1 Plugin Ecosystem
- [ ] **Plugin Ratings**: Community-driven quality scores
- [ ] **Usage Statistics**: Download and installation tracking
- [ ] **Plugin Collections**: Curated plugin bundles
- [ ] **Compatibility Matrix**: Plugin combination testing

### 7.2 Developer Tools
- [ ] **Plugin Templates**: Scaffolding for new plugins
- [ ] **Code Validation**: Pre-submission quality checks
- [ ] **Documentation Generator**: Auto-generate plugin docs
- [ ] **Testing Framework**: Automated plugin testing

### 7.3 Community Features
- [ ] **Plugin Reviews**: User feedback and ratings
- [ ] **Discussion Forums**: Plugin-specific discussions
- [ ] **Developer Profiles**: Author portfolios and statistics
- [ ] **Plugin Showcases**: Featured and trending plugins

---

## 🔄 Continuous Improvements

### Monitoring & Analytics
- [ ] **Performance Monitoring**: System performance tracking
- [ ] **Usage Analytics**: Search patterns and popular plugins
- [ ] **Error Tracking**: Analysis failures and recovery
- [ ] **Quality Metrics**: Code analysis accuracy measurement

### Infrastructure Scaling
- [ ] **Horizontal Scaling**: Multi-server deployment
- [ ] **Database Optimization**: Query performance tuning
- [ ] **Caching Strategy**: Redis/Memcached integration
- [ ] **CDN Integration**: Global content delivery

---

## 📝 Implementation Notes

### Technology Stack Decisions
- **Parser**: Start with advanced regex → migrate to Roslyn AST
- **Database**: PostgreSQL for structured data + Elasticsearch for search
- **API**: Node.js/TypeScript → consider Rust for performance-critical parts
- **Frontend**: React/Next.js with real-time search capabilities

### Success Metrics
- **Coverage**: >95% of active Oxide plugins indexed
- **Accuracy**: >98% correct metadata extraction
- **Performance**: <100ms search response time
- **Completeness**: All major plugin features detectable

---

*This roadmap represents a comprehensive vision for the Oxide Plugins Search System. Priorities may shift based on community needs and technical discoveries during implementation.*