import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface GitHubAppConfig {
  appId: string;
  installationId: string;
  privateKeyPath: string;
}

interface GitHubAppToken {
  token: string;
  expiresAt: Date;
}

class GitHubAppAuth {
  private config: GitHubAppConfig | null = null;
  private cachedToken: GitHubAppToken | null = null;
  private privateKey: string | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const appId = process.env.GITHUB_APP_ID;
    const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
    const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;

    if (appId && installationId && privateKeyPath) {
      this.config = {
        appId,
        installationId,
        privateKeyPath
      };
      
      try {
        this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        console.log('✅ GitHub App configuration loaded successfully');
      } catch (error) {
        console.error('❌ Failed to read private key file:', error);
        this.config = null;
      }
    }
  }

  public isConfigured(): boolean {
    return this.config !== null && this.privateKey !== null;
  }

  private generateJWT(): string {
    if (!this.config || !this.privateKey) {
      throw new Error('GitHub App not configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // Issued 60 seconds in the past to avoid clock skew
      exp: now + (10 * 60), // Expires in 10 minutes
      iss: this.config.appId
    };

    return jwt.sign(payload, this.privateKey, { algorithm: 'RS256' });
  }

  private async getInstallationToken(): Promise<string> {
    if (!this.config) {
      throw new Error('GitHub App not configured');
    }

    // Check if we have a valid cached token
    if (this.cachedToken && this.cachedToken.expiresAt > new Date()) {
      return this.cachedToken.token;
    }

    const jwtToken = this.generateJWT();
    const url = `https://api.github.com/app/installations/${this.config.installationId}/access_tokens`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${jwtToken}`,
        'User-Agent': 'oxide-rust-plugins-indexer/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get installation token: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Cache the token (expires in 1 hour, we'll refresh 5 minutes early)
    const expiresAt = new Date(data.expires_at);
    expiresAt.setMinutes(expiresAt.getMinutes() - 5);
    
    this.cachedToken = {
      token: data.token,
      expiresAt
    };

    console.log(`✅ GitHub App token obtained, expires at: ${data.expires_at}`);
    return data.token;
  }

  public async getAuthToken(): Promise<string> {
    if (!this.isConfigured()) {
      // Fallback to personal access token
      const personalToken = process.env.GITHUB_TOKEN;
      if (!personalToken) {
        throw new Error('Neither GitHub App nor Personal Access Token is configured');
      }
      console.log('⚠️  Using Personal Access Token (consider using GitHub App for higher rate limits)');
      return personalToken;
    }

    try {
      const token = await this.getInstallationToken();
      console.log('✅ Using GitHub App token');
      return token;
    } catch (error) {
      console.error('❌ Failed to get GitHub App token, falling back to Personal Access Token:', error);
      
      const personalToken = process.env.GITHUB_TOKEN;
      if (!personalToken) {
        throw new Error('GitHub App authentication failed and no Personal Access Token available');
      }
      
      return personalToken;
    }
  }

  public getRateLimitInfo(): { type: string; limit: number } {
    if (this.isConfigured()) {
      return {
        type: 'GitHub App',
        limit: 5000 // GitHub Apps get 5000 requests per hour per installation
      };
    } else {
      return {
        type: 'Personal Access Token',
        limit: 5000 // Personal tokens get 5000 requests per hour for authenticated requests
      };
    }
  }
}

export const githubAppAuth = new GitHubAppAuth();
export { GitHubAppAuth };