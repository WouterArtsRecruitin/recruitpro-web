/**
 * FlowMaster Pro V4 - Google Drive Integration Utility
 * PDF sync naar Google Drive account voor backup en toegankelijkheid
 * 
 * Features:
 * - Automatic PDF upload naar Google Drive
 * - Account: artsrecruitin@gmail.com
 * - Folder organisatie per datum
 * - Metadata synchronisatie
 * - Error handling en retry logic
 * - Offline queue management
 * 
 * Usage:
 * const driveSync = new GoogleDriveSync({
 *   account: 'artsrecruitin@gmail.com',
 *   folderId: '1Fli-d3KKJSkqHr8PSPOne46eftjHPFux'
 * });
 * driveSync.uploadPDF(pdfBlob, filename, metadata);
 */

class GoogleDriveSync {
    constructor(options = {}) {
        this.config = {
            account: options.account || 'artsrecruitin@gmail.com',
            folderId: options.folderId || '1Fli-d3KKJSkqHr8PSPOne46eftjHPFux',
            apiKey: options.apiKey || null, // Will need to be configured
            accessToken: options.accessToken || null,
            debug: options.debug || false
        };
        
        this.uploadQueue = [];
        this.isAuthenticated = false;
        this.retryAttempts = 3;
        this.retryDelay = 2000;
        
        this.init();
    }

    async init() {
        try {
            this.loadQueueFromStorage();
            this.setupEventListeners();
            
            // Check if we have stored credentials
            const storedAuth = localStorage.getItem('gdrive_auth');
            if (storedAuth) {
                const auth = JSON.parse(storedAuth);
                if (this.isTokenValid(auth)) {
                    this.config.accessToken = auth.accessToken;
                    this.isAuthenticated = true;
                    this.log('Google Drive authentication restored from storage');
                }
            }
            
            // Process any queued uploads
            if (this.isAuthenticated && this.uploadQueue.length > 0) {
                this.processUploadQueue();
            }
            
        } catch (error) {
            this.log('Initialization error:', error);
        }
    }

    setupEventListeners() {
        // Process queue when online
        window.addEventListener('online', () => {
            if (this.isAuthenticated && this.uploadQueue.length > 0) {
                this.log('Connection restored, processing upload queue');
                this.processUploadQueue();
            }
        });

        // Monitor auth status
        window.addEventListener('storage', (e) => {
            if (e.key === 'gdrive_auth') {
                const auth = e.newValue ? JSON.parse(e.newValue) : null;
                if (auth && this.isTokenValid(auth)) {
                    this.config.accessToken = auth.accessToken;
                    this.isAuthenticated = true;
                    this.log('Authentication updated from storage');
                }
            }
        });
    }

    /**
     * Initialize Google Drive API authentication
     * This should be called from a user interaction (button click)
     */
    async authenticate() {
        try {
            // Load Google API client
            if (!window.gapi) {
                await this.loadGoogleAPI();
            }

            // Initialize the API
            await new Promise((resolve, reject) => {
                gapi.load('auth2:client', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: this.config.apiKey,
                            clientId: this.getClientId(),
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                            scope: 'https://www.googleapis.com/auth/drive.file'
                        });
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            // Attempt sign in
            const authInstance = gapi.auth2.getAuthInstance();
            const user = await authInstance.signIn();
            
            this.config.accessToken = user.getAuthResponse().access_token;
            this.isAuthenticated = true;

            // Store auth info
            const authData = {
                accessToken: this.config.accessToken,
                expiresAt: Date.now() + (user.getAuthResponse().expires_in * 1000),
                account: user.getBasicProfile().getEmail()
            };
            
            localStorage.setItem('gdrive_auth', JSON.stringify(authData));
            
            this.log('Successfully authenticated with Google Drive');
            this.showNotification('Google Drive verbonden! PDFs worden nu automatisch gesynchroniseerd.', 'success');

            // Process any queued uploads
            if (this.uploadQueue.length > 0) {
                this.processUploadQueue();
            }

            return true;

        } catch (error) {
            this.log('Authentication failed:', error);
            this.showNotification('Google Drive verbinding mislukt. Probeer opnieuw.', 'error');
            return false;
        }
    }

    async loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    getClientId() {
        // This should be configured with actual OAuth client ID
        // For demo purposes, showing structure
        return '123456789-abcdefghijklmnop.apps.googleusercontent.com';
    }

    /**
     * Upload PDF to Google Drive
     */
    async uploadPDF(pdfBlob, filename, metadata = {}) {
        try {
            if (!this.isAuthenticated) {
                this.log('Not authenticated, queuing upload:', filename);
                this.queueUpload(pdfBlob, filename, metadata);
                this.showNotification('PDF wordt lokaal opgeslagen. Verbind met Google Drive voor automatische sync.', 'warning');
                return { queued: true, filename };
            }

            if (!navigator.onLine) {
                this.log('Offline, queuing upload:', filename);
                this.queueUpload(pdfBlob, filename, metadata);
                return { queued: true, filename };
            }

            const result = await this.performUpload(pdfBlob, filename, metadata);
            this.log('Successfully uploaded to Google Drive:', result);
            this.showNotification(`PDF geüpload naar Google Drive: ${filename}`, 'success');
            
            return result;

        } catch (error) {
            this.log('Upload failed:', error);
            this.queueUpload(pdfBlob, filename, metadata);
            this.showNotification('Upload naar Google Drive mislukt. PDF wordt lokaal bewaard.', 'warning');
            throw error;
        }
    }

    async performUpload(pdfBlob, filename, metadata, attempt = 1) {
        try {
            // Create folder structure if needed
            const folderId = await this.ensureDateFolder();

            // Prepare file metadata
            const fileMetadata = {
                name: filename,
                parents: [folderId],
                description: this.buildFileDescription(metadata)
            };

            // Convert blob to base64
            const base64Data = await this.blobToBase64(pdfBlob);
            
            // Upload file using multipart upload
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'multipart/related; boundary=\"foo_bar_baz\"'
                },
                body: this.buildMultipartBody(fileMetadata, base64Data, 'foo_bar_baz')
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, need re-authentication
                    this.isAuthenticated = false;
                    localStorage.removeItem('gdrive_auth');
                    throw new Error('Authentication expired');
                }
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            // Set file permissions (optional - make accessible to account)
            await this.setFilePermissions(result.id);
            
            return {
                success: true,
                fileId: result.id,
                filename: filename,
                webViewLink: result.webViewLink,
                uploadedAt: new Date().toISOString()
            };

        } catch (error) {
            this.log(`Upload attempt ${attempt} failed:`, error);
            
            if (attempt < this.retryAttempts) {
                const delay = this.retryDelay * Math.pow(2, attempt - 1);
                this.log(`Retrying upload in ${delay}ms...`);
                await this.sleep(delay);
                return this.performUpload(pdfBlob, filename, metadata, attempt + 1);
            }
            
            throw error;
        }
    }

    async ensureDateFolder() {
        try {
            const today = new Date();
            const folderName = `FlowMaster-Reports-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            
            // Check if folder exists
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and parents in '${this.config.folderId}' and mimeType='application/vnd.google-apps.folder'`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.accessToken}`
                    }
                }
            );

            const searchResult = await searchResponse.json();
            
            if (searchResult.files && searchResult.files.length > 0) {
                return searchResult.files[0].id;
            }

            // Create new folder
            const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [this.config.folderId]
                })
            });

            const createResult = await createResponse.json();
            this.log('Created date folder:', createResult);
            
            return createResult.id;

        } catch (error) {
            this.log('Error managing date folder:', error);
            // Fallback to main folder
            return this.config.folderId;
        }
    }

    buildFileDescription(metadata) {
        const parts = [
            'FlowMaster Pro V4 Assessment Report',
            `Generated: ${new Date().toLocaleString('nl-NL')}`,
            `Company: ${metadata.bedrijfsnaam || 'Unknown'}`,
            `Sector: ${metadata.sector || 'Unknown'}`,
            `Lead Score: ${metadata.leadScore || 'N/A'}`,
            `Contact: ${metadata.contactEmail || 'Not provided'}`,
            `Session: ${metadata.sessionId || 'Unknown'}`
        ];
        
        return parts.join(' | ');
    }

    buildMultipartBody(metadata, base64Data, boundary) {
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;

        let body = delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) + delimiter +
            'Content-Type: application/pdf\r\n' +
            'Content-Transfer-Encoding: base64\r\n\r\n' +
            base64Data +
            close_delim;

        return body;
    }

    async setFilePermissions(fileId) {
        try {
            // Make file accessible to the configured account
            await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role: 'owner',
                    type: 'user',
                    emailAddress: this.config.account
                })
            });
        } catch (error) {
            // Non-critical error
            this.log('Could not set file permissions:', error);
        }
    }

    queueUpload(pdfBlob, filename, metadata) {
        const queueItem = {
            id: this.generateId(),
            pdfBlob: pdfBlob,
            filename: filename,
            metadata: metadata,
            timestamp: new Date().toISOString(),
            attempts: 0
        };

        this.uploadQueue.push(queueItem);
        this.saveQueueToStorage();
        
        this.log('Queued upload:', filename);
    }

    async processUploadQueue() {
        if (this.uploadQueue.length === 0 || !this.isAuthenticated || !navigator.onLine) {
            return;
        }

        this.log(`Processing ${this.uploadQueue.length} queued uploads`);
        const processedItems = [];

        for (const item of this.uploadQueue) {
            try {
                await this.performUpload(item.pdfBlob, item.filename, item.metadata);
                processedItems.push(item.id);
                this.log('Successfully processed queued upload:', item.filename);
                
            } catch (error) {
                item.attempts++;
                this.log(`Failed to process queued upload ${item.filename}:`, error);
                
                // Remove after max attempts
                if (item.attempts >= this.retryAttempts) {
                    processedItems.push(item.id);
                    this.log(`Removing failed upload after ${item.attempts} attempts:`, item.filename);
                }
            }
        }

        // Remove processed items
        this.uploadQueue = this.uploadQueue.filter(item => !processedItems.includes(item.id));
        this.saveQueueToStorage();

        if (processedItems.length > 0) {
            this.showNotification(`${processedItems.length} PDF(s) gesynchroniseerd met Google Drive`, 'success');
        }
    }

    // Utility methods
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    isTokenValid(auth) {
        return auth.accessToken && auth.expiresAt && Date.now() < auth.expiresAt;
    }

    generateId() {
        return 'gds_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loadQueueFromStorage() {
        try {
            const stored = localStorage.getItem('gdrive_upload_queue');
            if (stored) {
                // Note: Blobs can't be stored in localStorage, so we'll need a different approach
                // For now, we'll just track metadata and rely on re-generation
                this.uploadQueue = JSON.parse(stored).map(item => ({
                    ...item,
                    pdfBlob: null // Will need to be regenerated
                }));
            }
        } catch (error) {
            this.log('Error loading upload queue:', error);
            this.uploadQueue = [];
        }
    }

    saveQueueToStorage() {
        try {
            // Save only metadata (not blobs)
            const queueMeta = this.uploadQueue.map(item => ({
                id: item.id,
                filename: item.filename,
                metadata: item.metadata,
                timestamp: item.timestamp,
                attempts: item.attempts
            }));
            localStorage.setItem('gdrive_upload_queue', JSON.stringify(queueMeta));
        } catch (error) {
            this.log('Error saving upload queue:', error);
        }
    }

    showNotification(message, type = 'info') {
        // Use the same notification system as PDF generator
        if (typeof window !== 'undefined') {
            const notification = document.createElement('div');
            notification.className = `gdrive-notification ${type}`;
            notification.textContent = `🗂️ ${message}`;
            notification.style.cssText = `
                position: fixed;
                top: 70px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10001;
                max-width: 350px;
                font-size: 14px;
                font-weight: 500;
                ${type === 'success' ? 'background: #10B981; color: white;' : ''}
                ${type === 'error' ? 'background: #EF4444; color: white;' : ''}
                ${type === 'warning' ? 'background: #F59E0B; color: white;' : ''}
                ${type === 'info' ? 'background: #3B82F6; color: white;' : ''}
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 6000);
        }
    }

    log(message, data = null) {
        if (this.config.debug) {
            console.log(`[Google Drive Sync] ${message}`, data);
        }
    }

    // Public API methods
    getQueueStatus() {
        return {
            queueLength: this.uploadQueue.length,
            isAuthenticated: this.isAuthenticated,
            isOnline: navigator.onLine,
            account: this.config.account,
            folderId: this.config.folderId
        };
    }

    async connectToDrive() {
        return this.authenticate();
    }

    disconnectFromDrive() {
        this.isAuthenticated = false;
        this.config.accessToken = null;
        localStorage.removeItem('gdrive_auth');
        
        if (window.gapi && gapi.auth2) {
            const authInstance = gapi.auth2.getAuthInstance();
            if (authInstance) {
                authInstance.signOut();
            }
        }
        
        this.showNotification('Google Drive verbinding verbroken', 'info');
    }

    clearQueue() {
        this.uploadQueue = [];
        this.saveQueueToStorage();
        localStorage.removeItem('gdrive_upload_queue');
    }

    async testConnection() {
        if (!this.isAuthenticated) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return { 
                    success: true, 
                    user: data.user,
                    message: `Connected as ${data.user.emailAddress}`
                };
            } else {
                return { success: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleDriveSync;
}

// Global instance for direct HTML usage
if (typeof window !== 'undefined') {
    window.GoogleDriveSync = GoogleDriveSync;
}