
import type { User } from 'firebase/auth';
import type { AppState } from '@/context/app-state-provider';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILE_NAME = 'school-routine-backup.json';
const BACKUP_MIME_TYPE = 'application/json';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export class GoogleDriveService {
  private gapiInited = false;
  private gisInited = false;
  private tokenClient: any = null;

  constructor() {
    this.loadGapiScript();
  }

  private loadGapiScript() {
    if (document.getElementById('gapi-script')) return;
    const script = document.createElement('script');
    script.id = 'gapi-script';
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => window.gapi.load('client', () => this.initializeGapiClient());
    document.body.appendChild(script);
  }

  private async initializeGapiClient() {
    await window.gapi.client.init({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    });
    this.gapiInited = true;
  }

  public async init(user: User) {
    await new Promise<void>(resolve => {
        const interval = setInterval(() => {
            if(this.gapiInited) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });

    const accessToken = await user.getIdToken(true);
    window.gapi.client.setToken({ access_token: accessToken });
  }

  public isReady(): boolean {
    return this.gapiInited && !!window.gapi.client.getToken();
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
        headers: new Headers({ 'Authorization': 'Bearer ' + window.gapi.client.getToken().access_token }),
        body: form,
      });

    } else {
      // Create new file
      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: BACKUP_MIME_TYPE,
        parents: ['appDataFolder'], // Store in app-specific folder if possible, otherwise 'root'
      };
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + window.gapi.client.getToken().access_token }),
        body: form,
      });
    }
  }
}
