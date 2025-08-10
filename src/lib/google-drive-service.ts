
import type { AppState } from '@/context/app-state-provider';

const BACKUP_FILE_NAME = 'school-routine-backup.bsr';
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
        const errorText = await response.text();
        console.error('Error listing files:', errorText);
        throw new Error(`Failed to list files from Google Drive. Status: ${response.status}. Message: ${errorText}`);
    }
    
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  }

  public async loadBackup(): Promise<Omit<AppState, 'adjustments' | 'teacherLoad'> | null> {
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
        const errorText = await response.text();
        console.error('Error loading backup:', errorText);
        throw new Error(`Failed to load backup from Google Drive. Status: ${response.status}. Message: ${errorText}`);
    }

    try {
        return await response.json();
    } catch (e) {
        console.error("Failed to parse JSON from Drive backup", e);
        return null;
    }
  }

  public async saveBackup(state: Omit<AppState, 'adjustments' | 'teacherLoad'>): Promise<void> {
    if (!this.isReady()) throw new Error('Google Drive API not ready.');

    const fileId = await this.getFileId();
    const backupData = JSON.stringify(state, null, 2);
    const blob = new Blob([backupData], { type: BACKUP_MIME_TYPE });
    
    const headers = new Headers({ 'Authorization': `Bearer ${this.accessToken}` });
    const form = new FormData();
    const metadata = { name: BACKUP_FILE_NAME, mimeType: BACKUP_MIME_TYPE };

    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob, BACKUP_FILE_NAME);

    const uploadUrl = fileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
      
    const method = fileId ? 'PATCH' : 'POST';

    const response = await fetch(uploadUrl, {
      method,
      headers,
      body: form,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error ${method === 'POST' ? 'creating' : 'updating'} file:`, errorText);
      throw new Error(`Failed to ${method === 'POST' ? 'create' : 'update'} backup file. Status: ${response.status}. Message: ${errorText}`);
    }
  }
}
