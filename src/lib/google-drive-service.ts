
import type { AppState } from '@/context/app-state-provider';
import type { User } from 'firebase/auth';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILE_NAME = 'school-routine-backup.json';
const BACKUP_MIME_TYPE = 'application/json';

declare global {
  interface Window {
    gapi: any;
  }
}

export class GoogleDriveService {
  private gapiReady = false;
  private accessToken: string | null = null;

  constructor() {
    this.loadGapiScript();
  }

  private loadGapiScript() {
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined') return resolve();
      if (document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
        const checkGapi = setInterval(() => {
          if (window.gapi?.client) {
            this.gapiReady = true;
            clearInterval(checkGapi);
            resolve();
          }
        }, 100);
        return;
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

  public async init(token: string) {
    if (!this.gapiReady) {
        await this.loadGapiScript();
    }
    this.accessToken = token;
    window.gapi.client.setToken({ access_token: token });
  }

  public isReady(): boolean {
    return this.gapiReady && !!this.accessToken && !!window.gapi?.client;
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
    if (!this.accessToken) throw new Error("Not authenticated with Google Drive");

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
        headers: new Headers({ 'Authorization': 'Bearer ' + this.accessToken }),
        body: form,
      });

    } else {
      // Create new file
      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: BACKUP_MIME_TYPE,
        parents: ['root'],
      };
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + this.accessToken }),
        body: form,
      });
    }
  }
}
