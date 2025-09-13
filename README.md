# Rust Oxide Plugins Forum

A comprehensive platform for indexing, searching, and discovering Rust Oxide plugins from GitHub repositories.

## Project Structure

```
plugins-forum/
├── backend/          # TypeScript indexer backend
│   ├── src/          # Indexer source code
│   ├── output/       # Generated plugin data
│   ├── package.json  # Backend dependencies
│   └── .github/      # CI/CD workflows
└── frontend/         # React frontend application
    ├── src/          # React components and logic
    ├── public/       # Static assets
    └── package.json  # Frontend dependencies
```

## Features

### Backend (Indexer)
- **GitHub Integration**: Searches GitHub repositories for Oxide plugins
- **Smart Indexing**: Uses multiple search strategies to overcome API limits
- **Resume Capability**: Can continue from where it left off
- **Continuous Monitoring**: Automatically finds and indexes new plugins
- **CI/CD**: GitHub Actions workflow for scheduled indexing

### Frontend (React App)
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Real-time Search**: Instant search across plugin names, authors, repositories
- **Rich Plugin Cards**: Detailed information with stats and links
- **Statistics**: Live count and update information
- **Mobile Friendly**: Responsive design for all devices

## Quick Start

### Backend Setup

```bash
cd backend
npm install
npm run build

# Set your GitHub token
export GITHUB_TOKEN=your_github_token_here

# Run the indexer
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend will be available at `http://localhost:3000`

## Configuration

### Backend Environment Variables

- `GITHUB_TOKEN`: Your GitHub personal access token (required)
- `CONTINUOUS`: Set to "true" for continuous monitoring mode
- `CYCLE_DELAY_MS`: Delay between cycles in continuous mode (default: 300000ms)

### Frontend Configuration

The frontend automatically fetches data from the GitHub-hosted JSON file. No additional configuration needed.

## API Endpoints

The frontend consumes data from:
- `https://raw.githubusercontent.com/publicrust/plugins-forum/main/backend/output/oxide_plugins.json`

## Development

### Backend Development

```bash
cd backend
npm run build  # Compile TypeScript
npm start      # Run indexer
```

### Frontend Development

```bash
cd frontend
npm start      # Start development server
npm run build  # Build for production
```

## Data Format

The indexer generates a JSON file with the following structure:

```json
{
  "generated_at": "2025-08-17T13:43:24.283Z",
  "query": "namespace Oxide.Plugins in:file language:C# extension:cs",
  "count": 5090,
  "items": [
    {
      "plugin_name": "SimpleScrapShop",
      "plugin_author": "djimbou92",
      "language": "C#",
      "file": {
        "path": "SimpleScrapShop.cs",
        "html_url": "https://github.com/...",
        "raw_url": "https://raw.githubusercontent.com/..."
      },
      "repository": {
        "full_name": "djimbou92/SimpleScrapShop",
        "name": "SimpleScrapShop",
        "html_url": "https://github.com/...",
        "description": "A simple Rust shop plugin...",
        "owner_login": "djimbou92",
        "stargazers_count": 0,
        "forks_count": 0,
        "open_issues_count": 0
      },
      "commits": {
        "created": { /* commit info */ },
        "latest": { /* commit info */ }
      },
      "indexed_at": "2025-08-17T11:14:57.040Z"
    }
  ]
}
```

## CI/CD

The project uses GitHub Actions for automated indexing:

- **Schedule**: Runs every 30 minutes
- **Manual Trigger**: Can be triggered manually via GitHub Actions
- **Auto-commit**: Automatically commits changes to the repository
- **Data Source**: Updates the JSON file used by the frontend

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both backend and frontend
5. Submit a pull request

## License

This project is open source and available under the MIT License.


