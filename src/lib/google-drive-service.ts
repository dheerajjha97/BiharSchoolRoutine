
import type { AppState } from '@/context/app-state-provider';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILE_NAME = 'school-routine-backup.json';
const BACKUP_MIME_TYPE = 'application/json';

declare global {
  interface Window {
    gapi: any;
    google: any;
    tokenClient: any;
  }
}

export class GoogleDriveService {
  private gapiReady = false;
  private gisReady = false;

  constructor() {
    this.loadGapiScript();
    this.loadGisScript();
  }

  private loadGapiScript() {
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined') return resolve();
      if (window.gapi?.client) {
          this.gapiReady = true;
          return resolve();
      }
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.gapi.load('client', async () => {
          await window.gapi.client.init({
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
          });
          this.gapiReady = true;
          resolve();
        });
      };
      document.body.appendChild(script);
    });
  }

  private loadGisScript() {
    return new Promise<void>((resolve) => {
       if (typeof window === 'undefined') return resolve();
       if (window.google?.accounts) {
        this.gisReady = true;
        // Re-initialize token client if it doesn't exist
        if (!window.tokenClient) {
             window.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: '', // Callback is handled by the Promise in getToken
            });
        }
        return resolve();
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: '', // Callback is handled by the Promise in getToken
        });
        this.gisReady = true;
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  public async init() {
    await Promise.all([this.loadGapiScript(), this.loadGisScript()]);
    await this.getToken();
  }
  
  private async getToken() {
      return new Promise<void>((resolve, reject) => {
        if (typeof window === 'undefined' || !window.gapi || !window.tokenClient) {
            return reject(new Error("Google API scripts not loaded."));
        }
        
        const token = window.gapi.client.getToken();
        if (token) {
            return resolve();
        }
        
        window.tokenClient.callback = (resp: any) => {
            if (resp.error) {
                return reject(resp);
            }
            window.gapi.client.setToken(resp);
            resolve();
        };

        if (!window.gapi.client.getToken()) {
            window.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            resolve();
        }
    });
  }
  
  public isReady(): boolean {
    return this.gapiReady && this.gisReady && typeof window !== 'undefined' && !!window.gapi.client.getToken();
  }

  private async getFileId(): Promise<string | null> {
    if (!this.isReady()) throw new Error('Google Drive API not ready.');

    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name='${BACKUP_FILE_NAME}' and mimeType='${BACKUP_MIME_TYPE}' and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name)',
      });
      
      if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
      }
      return null;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  public async loadBackup(): Promise<AppState | null> {
    if (!this.isReady()) throw new Error('Google Drive API not ready.');
    
    const fileId = await this.getFileId();
    if (!fileId) {
      return null;
    }

    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });
      return JSON.parse(response.body) as AppState;
    } catch (error) {
      console.error('Error loading backup:', error);
      throw error;
    }
  }

  public async saveBackup(state: AppState): Promise<void> {
    if (!this.isReady()) throw new Error('Google Drive API not ready.');

    const fileId = await this.getFileId();
    const backupData = JSON.stringify(state, null, 2);
    const blob = new Blob([backupData], { type: BACKUP_MIME_TYPE });
    
    const form = new FormData();
    const token = window.gapi.client.getToken();
    if (!token) throw new Error("Not authenticated with Google Drive");

    if (fileId) {
      // Update existing file
      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: BACKUP_MIME_TYPE,
      };
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);
      
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
        method: 'PATCH',
        headers: new Headers({ 'Authorization': 'Bearer ' + token.access_token }),
        body: form,
      });

    } else {
      // Create new file
      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: BACKUP_MIME_TYPE,
        parents: ['root'], // Using 'root' instead of 'appDataFolder' for user visibility
      };
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + token.access_token }),
        body: form,
      });
    }
  }
}
