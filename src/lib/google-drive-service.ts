
import type { AppState } from '@/context/app-state-provider';

const BACKUP_FILE_NAME = 'school-routine-backup.json';
const BACKUP_MIME_TYPE = 'application/json';

export class GoogleDriveService {
  private accessToken: string | null = null;

  public async init(token: string) {
    this.accessToken = token;
  }

  public isReady(): boolean {
    return !!this.accessToken;
  }

  private async getFileId(): Promise<string | null> {
    if (!this.isReady()) throw new Error('Google Drive API not ready.');

    const headers = new Headers({
      'Authorization': `Bearer ${this.accessToken}`,
    });

    const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and mimeType='${BACKUP_MIME_TYPE}' and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)`;

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
        const error = await response.json();
        console.error('Error listing files:', error);
        throw new Error('Failed to list files from Google Drive.');
    }
    
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  }

  public async loadBackup(): Promise<Omit<AppState, 'adjustments'> | null> {
    if (!this.isReady()) throw new Error('Google Drive API not ready.');
    
    const fileId = await this.getFileId();
    if (!fileId) {
      return null;
    }
    
    const headers = new Headers({
      'Authorization': `Bearer ${this.accessToken}`,
    });
    
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
        console.error('Error loading backup:', await response.text());
        throw new Error('Failed to load backup from Google Drive.');
    }

    return response.json() as Promise<Omit<AppState, 'adjustments'>>;
  }

  public async saveBackup(state: Omit<AppState, 'adjustments'>): Promise<void> {
    if (!this.isReady()) throw new Error('Google Drive API not ready.');

    const fileId = await this.getFileId();
    const backupData = JSON.stringify(state, null, 2);
    const blob = new Blob([backupData], { type: BACKUP_MIME_TYPE });
    
    const form = new FormData();
    const headers = new Headers({ 'Authorization': 'Bearer ' + this.accessToken });

    if (fileId) {
      const metadata = { name: BACKUP_FILE_NAME, mimeType: BACKUP_MIME_TYPE };
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);
      
      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
        method: 'PATCH',
        headers,
        body: form,
      });
      if (!response.ok) {
        const error = await response.json();
        console.error('Error updating file:', error);
        throw new Error('Failed to update backup file.');
      }

    } else {
      const metadata = { name: BACKUP_FILE_NAME, mimeType: BACKUP_MIME_TYPE, parents: ['root'] };
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
        method: 'POST',
        headers,
        body: form,
      });
      if (!response.ok) {
        const error = await response.json();
        console.error('Error creating file:', error);
        throw new Error('Failed to create backup file.');
      }
    }
  }
}
