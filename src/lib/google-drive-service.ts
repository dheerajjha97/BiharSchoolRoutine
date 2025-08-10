
import type { AppState } from '@/context/app-state-provider';

const BACKUP_FILE_NAME = 'school-routine-data.json';
const BACKUP_MIME_TYPE = 'application/json';

export class GoogleDriveService {

  private async getFileId(accessToken: string): Promise<string | null> {
    if (!accessToken) throw new Error('Google Drive API requires an access token.');

    const headers = new Headers({
      'Authorization': `Bearer ${accessToken}`,
    });

    const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and mimeType='${BACKUP_MIME_TYPE}' and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)`;

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Error listing files:', errorBody);
        throw new Error(`Failed to list files. Status: ${response.status}. Message: ${errorBody.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  }

  public async loadBackup(accessToken: string): Promise<Omit<AppState, 'adjustments' | 'teacherLoad'> | null> {
    if (!accessToken) throw new Error('Google Drive API requires an access token.');
    
    const fileId = await this.getFileId(accessToken);
    if (!fileId) {
      console.log("No backup file found in Google Drive.");
      return null;
    }
    
    const headers = new Headers({
      'Authorization': `Bearer ${accessToken}`,
    });
    
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Error loading backup:', errorBody);
        throw new Error(`Failed to load backup. Status: ${response.status}. Message: ${errorBody.error?.message || response.statusText}`);
    }

    try {
        return await response.json();
    } catch (e) {
        console.error("Failed to parse JSON from Drive backup", e);
        return null;
    }
  }

  public async saveBackup(state: Omit<AppState, 'adjustments' | 'teacherLoad'>, accessToken: string): Promise<void> {
    if (!accessToken) throw new Error('Google Drive API requires an access token.');

    const fileId = await this.getFileId(accessToken);
    const backupData = JSON.stringify(state, null, 2);
    const blob = new Blob([backupData], { type: BACKUP_MIME_TYPE });
    
    const headers = new Headers({ 'Authorization': 'Bearer ' + accessToken });
    const formData = new FormData();
      
    if (fileId) {
      // Update existing file
      const metadata = { name: BACKUP_FILE_NAME, mimeType: BACKUP_MIME_TYPE };
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);
      
      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
        method: 'PATCH',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Error updating file:', errorBody);
        throw new Error(`Failed to update backup. Status: ${response.status}. Message: ${errorBody.error?.message || response.statusText}`);
      }

    } else {
      // Create new file
      const metadata = { name: BACKUP_FILE_NAME, mimeType: BACKUP_MIME_TYPE, parents: ['root'] };
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);

      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Error creating file:', errorBody);
        throw new Error(`Failed to create backup. Status: ${response.status}. Message: ${errorBody.error?.message || response.statusText}`);
      }
    }
  }
}
