/**
 * FlowMaster Pro V4 - Webhook Handler Component
 * Multi-webhook backend integration met fallback mechanismen
 * 
 * Features:
 * - Multi-endpoint webhook support (Zapier, PipeDrive, Email, Backup)
 * - Retry mechanisms met exponential backoff
 * - Error handling & logging
 * - Offline queue management
 * - Analytics integration
 * 
 * Usage:
 * const webhook = new WebhookHandler({
 *   endpoints: {
 *     zapier: 'https://hooks.zapier.com/...',
 *     pipedrive: 'https://api.pipedrive.com/...'
 *   }
 * });
 * webhook.sendAssessmentData(assessmentData);
 */

class WebhookHandler {
    constructor(options = {}) {
        this.endpoints = options.endpoints || {};
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.timeout = options.timeout || 10000;
        this.offlineQueue = [];
        
        this.init();
    }

    init() {
        this.loadOfflineQueue();
        this.setupEventListeners();
        this.startQueueProcessor();
    }

    loadOfflineQueue() {
        try {
            const stored = localStorage.getItem('webhook_offline_queue');
            if (stored) {
                this.offlineQueue = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading offline queue:', error);
            this.offlineQueue = [];
        }
    }

    saveOfflineQueue() {
        try {
            localStorage.setItem('webhook_offline_queue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.error('Error saving offline queue:', error);
        }
    }

    setupEventListeners() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('Connection restored, processing offline queue');
                this.processOfflineQueue();
            });

            window.addEventListener('offline', () => {
                console.log('Connection lost, queuing requests offline');
            });
        }
    }

    startQueueProcessor() {
        // Process queue every 30 seconds
        setInterval(() => {
            if (this.offlineQueue.length > 0 && navigator.onLine) {
                this.processOfflineQueue();
            }
        }, 30000);
    }

    async sendAssessmentData(assessmentData) {
        const payload = this.buildPayload(assessmentData);
        const results = {};

        // Define webhook endpoints in priority order
        const webhooks = [
            { name: 'zapier', url: this.endpoints.zapier, priority: 1 },
            { name: 'pipedrive', url: this.endpoints.pipedrive, priority: 2 },
            { name: 'email', url: this.endpoints.email, priority: 3 },
            { name: 'backup', url: this.endpoints.backup, priority: 4 }
        ];

        // Attempt to send to all endpoints
        for (const webhook of webhooks) {
            if (webhook.url) {
                try {
                    const result = await this.sendToEndpoint(webhook.name, webhook.url, payload);
                    results[webhook.name] = { success: true, result };
                    this.trackWebhookSuccess(webhook.name, payload);
                } catch (error) {
                    results[webhook.name] = { success: false, error: error.message };
                    this.trackWebhookError(webhook.name, error, payload);
                    
                    // Queue for offline processing if critical endpoint fails
                    if (webhook.priority <= 2) {
                        this.queueForOffline(webhook.name, webhook.url, payload);
                    }
                }
            }
        }

        return results;
    }

    async sendToEndpoint(name, url, payload, attempt = 1) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'FlowMaster-Pro-V4/1.0'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`Webhook ${name} success:`, data);
            return data;

        } catch (error) {
            console.error(`Webhook ${name} error (attempt ${attempt}):`, error.message);

            // Retry with exponential backoff
            if (attempt < this.retryAttempts) {
                const delay = this.retryDelay * Math.pow(2, attempt - 1);
                console.log(`Retrying ${name} in ${delay}ms...`);
                
                await this.sleep(delay);
                return this.sendToEndpoint(name, url, payload, attempt + 1);
            }

            throw error;
        }
    }

    buildPayload(assessmentData) {
        const leadScore = this.calculateLeadScore(assessmentData);
        const timestamp = new Date().toISOString();

        return {
            // Core assessment data
            bedrijf: {
                naam: assessmentData.bedrijfsnaam,
                sector: assessmentData.sector,
                sectorNaam: this.getSectorName(assessmentData.sector),
                werknemers: assessmentData.werknemers,
                assessment_completed_at: timestamp
            },

            // Contact information
            contact: {
                naam: assessmentData.contact?.naam,
                email: assessmentData.contact?.email,
                telefoon: assessmentData.contact?.telefoon
            },

            // Lead scoring
            lead_score: {
                total: leadScore.total,
                grade: leadScore.grade,
                size_score: leadScore.sizeScore,
                sector_score: leadScore.sectorScore,
                urgency: this.calculateUrgency(assessmentData),
                potential: this.calculatePotential(assessmentData)
            },

            // Assessment metadata
            assessment: {
                version: 'FlowMaster-Pro-V4',
                duration_seconds: assessmentData.duration || 0,
                questions_answered: Object.keys(assessmentData.antwoorden || {}).length,
                completion_rate: this.calculateCompletionRate(assessmentData)
            },

            // Marketing data
            marketing: {
                source: 'flowmaster-assessment',
                campaign: 'technical-recruitment-v4',
                medium: 'assessment-form',
                timestamp: timestamp,
                session_id: this.generateSessionId()
            },

            // Technical metadata
            technical: {
                user_agent: navigator.userAgent,
                screen_resolution: `${screen.width}x${screen.height}`,
                language: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };
    }

    calculateLeadScore(data) {
        // Company size scoring
        let sizeScore = 50;
        switch (data.werknemers) {
            case '1-10': sizeScore = 40; break;
            case '11-50': sizeScore = 70; break;
            case '51-250': sizeScore = 90; break;
            case '250+': sizeScore = 100; break;
        }

        // Sector complexity scoring
        let sectorScore = 50;
        switch (data.sector) {
            case 'bouw': sectorScore = 85; break;
            case 'installatie': sectorScore = 90; break;
            case 'metaal': sectorScore = 80; break;
            case 'machinebouw': sectorScore = 95; break;
            case 'hightech': sectorScore = 100; break;
            case 'andere': sectorScore = 60; break;
        }

        // Assessment engagement scoring
        const engagementScore = this.calculateEngagementScore(data);

        const total = Math.min(300, sizeScore + sectorScore + engagementScore);
        let grade = 'D';
        if (total >= 240) grade = 'A+';
        else if (total >= 200) grade = 'A';
        else if (total >= 160) grade = 'B';
        else if (total >= 120) grade = 'C';

        return { total, grade, sizeScore, sectorScore, engagementScore };
    }

    calculateEngagementScore(data) {
        let score = 50;
        
        // Time spent scoring
        const duration = data.duration || 0;
        if (duration > 300) score += 20; // > 5 minutes
        else if (duration > 180) score += 15; // > 3 minutes
        else if (duration > 60) score += 10; // > 1 minute

        // Contact completeness
        const contact = data.contact || {};
        if (contact.email) score += 15;
        if (contact.telefoon) score += 10;
        if (contact.naam) score += 5;

        return Math.min(100, score);
    }

    calculateUrgency(data) {
        // High urgency for large companies in complex sectors
        const isLarge = ['51-250', '250+'].includes(data.werknemers);
        const isComplex = ['machinebouw', 'hightech', 'installatie'].includes(data.sector);
        
        if (isLarge && isComplex) return 'high';
        if (isLarge || isComplex) return 'medium';
        return 'low';
    }

    calculatePotential(data) {
        const score = this.calculateLeadScore(data);
        if (score.total >= 200) return 'high';
        if (score.total >= 150) return 'medium';
        return 'low';
    }

    calculateCompletionRate(data) {
        const totalQuestions = 24; // Base questions
        const answered = Object.keys(data.antwoorden || {}).length;
        return Math.round((answered / totalQuestions) * 100);
    }

    getSectorName(sectorId) {
        const sectors = {
            'bouw': 'Bouw & Constructie',
            'installatie': 'Installatietechniek (W/E/Klimaat)',
            'metaal': 'Metaalbewerking & Industrie',
            'machinebouw': 'Machinebouw & Equipment',
            'hightech': 'High-tech & Elektronica',
            'andere': 'Andere technische sector'
        };
        return sectors[sectorId] || 'Onbekend';
    }

    generateSessionId() {
        return 'fm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    queueForOffline(name, url, payload) {
        const queueItem = {
            id: this.generateSessionId(),
            name,
            url,
            payload,
            timestamp: new Date().toISOString(),
            attempts: 0
        };

        this.offlineQueue.push(queueItem);
        this.saveOfflineQueue();
        
        console.log(`Queued ${name} webhook for offline processing`);
    }

    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) return;

        console.log(`Processing ${this.offlineQueue.length} queued webhooks`);
        const processedItems = [];

        for (const item of this.offlineQueue) {
            try {
                await this.sendToEndpoint(item.name, item.url, item.payload);
                processedItems.push(item.id);
                console.log(`Successfully processed queued webhook: ${item.name}`);
            } catch (error) {
                item.attempts++;
                console.error(`Failed to process queued webhook ${item.name}:`, error.message);
                
                // Remove after max attempts
                if (item.attempts >= this.retryAttempts) {
                    processedItems.push(item.id);
                    console.log(`Removing failed webhook after ${item.attempts} attempts: ${item.name}`);
                }
            }
        }

        // Remove processed items
        this.offlineQueue = this.offlineQueue.filter(item => !processedItems.includes(item.id));
        this.saveOfflineQueue();
    }

    trackWebhookSuccess(name, payload) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'webhook_success', {
                event_category: 'webhook',
                event_label: name,
                custom_parameter_1: payload.bedrijf?.sector || 'unknown'
            });
        }

        if (typeof fbq !== 'undefined') {
            fbq('track', 'SubmitApplication', {
                content_name: 'assessment_completion',
                content_category: payload.bedrijf?.sector || 'unknown'
            });
        }
    }

    trackWebhookError(name, error, payload) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'webhook_error', {
                event_category: 'error',
                event_label: name,
                custom_parameter_1: error.message
            });
        }

        console.error(`Webhook ${name} failed:`, {
            error: error.message,
            payload: payload,
            timestamp: new Date().toISOString()
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API methods
    setEndpoint(name, url) {
        this.endpoints[name] = url;
    }

    getEndpoints() {
        return { ...this.endpoints };
    }

    getQueueStatus() {
        return {
            queueLength: this.offlineQueue.length,
            isOnline: navigator.onLine,
            oldestItem: this.offlineQueue.length > 0 ? this.offlineQueue[0].timestamp : null
        };
    }

    clearQueue() {
        this.offlineQueue = [];
        this.saveOfflineQueue();
    }

    async testEndpoint(name) {
        if (!this.endpoints[name]) {
            throw new Error(`Endpoint ${name} not configured`);
        }

        const testPayload = {
            test: true,
            timestamp: new Date().toISOString(),
            endpoint: name
        };

        try {
            const result = await this.sendToEndpoint(name, this.endpoints[name], testPayload);
            return { success: true, result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebhookHandler;
}

// Global instance for direct HTML usage
if (typeof window !== 'undefined') {
    window.WebhookHandler = WebhookHandler;
}