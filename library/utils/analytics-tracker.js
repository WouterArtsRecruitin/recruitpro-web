/**
 * FlowMaster Pro V4 - Analytics Tracker Utility
 * Comprehensive analytics tracking voor recruitment intelligence
 * 
 * Features:
 * - Google Analytics 4 integration
 * - Facebook Pixel tracking
 * - LinkedIn Insight Tag
 * - Custom event tracking
 * - A/B testing support
 * - Conversion funnel analytics
 * 
 * Usage:
 * const analytics = new AnalyticsTracker({
 *   ga4: 'G-XXXXXXXXXX',
 *   facebook: '1234567890',
 *   linkedin: '12345'
 * });
 * analytics.trackAssessmentStart();
 */

class AnalyticsTracker {
    constructor(options = {}) {
        this.config = {
            ga4: options.ga4 || 'G-2K8J9L4M6N',
            facebook: options.facebook || '1234567890123456',
            linkedin: options.linkedin || '12345',
            debug: options.debug || false
        };
        
        this.sessionData = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            events: []
        };

        this.init();
    }

    init() {
        this.loadGoogleAnalytics();
        this.loadFacebookPixel();
        this.loadLinkedInInsight();
        this.setupCustomTracking();
        this.trackPageView();
    }

    loadGoogleAnalytics() {
        if (typeof gtag === 'undefined' && this.config.ga4) {
            // Load GA4 script
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.ga4}`;
            document.head.appendChild(script);

            // Initialize gtag
            window.dataLayer = window.dataLayer || [];
            window.gtag = function() { dataLayer.push(arguments); };
            
            gtag('js', new Date());
            gtag('config', this.config.ga4, {
                send_page_view: false, // We'll send manually
                custom_map: {
                    'custom_parameter_1': 'sector',
                    'custom_parameter_2': 'company_size',
                    'custom_parameter_3': 'lead_score'
                }
            });

            this.log('Google Analytics 4 loaded');
        }
    }

    loadFacebookPixel() {
        if (typeof fbq === 'undefined' && this.config.facebook) {
            // Load Facebook Pixel
            !function(f,b,e,v,n,t,s) {
                if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)
            }(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');

            fbq('init', this.config.facebook);
            fbq('track', 'PageView');

            this.log('Facebook Pixel loaded');
        }
    }

    loadLinkedInInsight() {
        if (typeof _linkedin_partner_id === 'undefined' && this.config.linkedin) {
            window._linkedin_partner_id = this.config.linkedin;
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
            window._linkedin_data_partner_ids.push(this.config.linkedin);

            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
            document.head.appendChild(script);

            this.log('LinkedIn Insight Tag loaded');
        }
    }

    setupCustomTracking() {
        // Track form interactions
        document.addEventListener('input', (e) => {
            if (e.target.closest('.step-form')) {
                this.trackFormInteraction(e.target);
            }
        });

        // Track button clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('sector-card')) {
                this.trackSectorSelection(e.target.dataset.sector);
            }
            if (e.target.classList.contains('btn-primary')) {
                this.trackButtonClick('primary', e.target.textContent);
            }
        });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackPageHide();
            } else {
                this.trackPageShow();
            }
        });

        // Track time on page
        window.addEventListener('beforeunload', () => {
            this.trackSessionEnd();
        });
    }

    trackPageView() {
        const pageData = {
            page_title: document.title,
            page_location: window.location.href,
            page_path: window.location.pathname,
            session_id: this.sessionData.sessionId
        };

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_view', pageData);
        }

        // Custom tracking
        this.trackCustomEvent('page_view', pageData);
        this.log('Page view tracked', pageData);
    }

    trackAssessmentStart(data = {}) {
        const eventData = {
            event_category: 'assessment',
            event_label: 'start',
            session_id: this.sessionData.sessionId,
            ...data
        };

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'assessment_start', eventData);
        }

        // Facebook Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', 'InitiateCheckout', {
                content_name: 'assessment_start',
                content_category: 'recruitment'
            });
        }

        // Custom tracking
        this.trackCustomEvent('assessment_start', eventData);
        this.log('Assessment start tracked', eventData);
    }

    trackSectorSelection(sector) {
        const eventData = {
            event_category: 'assessment',
            event_label: 'sector_selection',
            custom_parameter_1: sector,
            session_id: this.sessionData.sessionId
        };

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'sector_selection', eventData);
        }

        // Facebook Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', 'ViewContent', {
                content_name: 'sector_selection',
                content_category: sector
            });
        }

        // Custom tracking
        this.trackCustomEvent('sector_selection', { sector, ...eventData });
        this.log('Sector selection tracked', { sector });
    }

    trackFormInteraction(element) {
        const eventData = {
            event_category: 'form',
            event_label: 'field_interaction',
            field_name: element.name || element.id,
            field_type: element.type,
            session_id: this.sessionData.sessionId
        };

        // Throttle form interaction events (max 1 per second per field)
        const throttleKey = `form_${element.name}_${element.type}`;
        if (this.isThrottled(throttleKey, 1000)) return;

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'form_interaction', eventData);
        }

        // Custom tracking
        this.trackCustomEvent('form_interaction', eventData);
    }

    trackAssessmentStep(stepNumber, stepData = {}) {
        const eventData = {
            event_category: 'assessment',
            event_label: 'step_completion',
            step_number: stepNumber,
            session_id: this.sessionData.sessionId,
            ...stepData
        };

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'assessment_step', eventData);
        }

        // Facebook Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', 'CompleteRegistration', {
                content_name: `assessment_step_${stepNumber}`,
                value: stepNumber,
                currency: 'EUR'
            });
        }

        // Custom tracking
        this.trackCustomEvent('assessment_step', eventData);
        this.log(`Assessment step ${stepNumber} tracked`, eventData);

        // Track funnel progression
        this.trackFunnelStep('assessment', stepNumber, 10);
    }

    trackAssessmentComplete(assessmentData) {
        const leadScore = this.calculateLeadScore(assessmentData);
        
        const eventData = {
            event_category: 'assessment',
            event_label: 'completion',
            custom_parameter_1: assessmentData.sector,
            custom_parameter_2: assessmentData.werknemers,
            custom_parameter_3: leadScore.total,
            session_id: this.sessionData.sessionId,
            assessment_duration: this.sessionData.sessionDuration
        };

        // Google Analytics - Enhanced Ecommerce
        if (typeof gtag !== 'undefined') {
            gtag('event', 'purchase', {
                transaction_id: this.sessionData.sessionId,
                value: leadScore.total,
                currency: 'EUR',
                items: [{
                    item_id: 'assessment_complete',
                    item_name: 'FlowMaster Assessment',
                    item_category: assessmentData.sector,
                    quantity: 1,
                    price: leadScore.total
                }]
            });
        }

        // Facebook Pixel - Conversion
        if (typeof fbq !== 'undefined') {
            fbq('track', 'Purchase', {
                value: leadScore.total,
                currency: 'EUR',
                content_name: 'assessment_completion',
                content_category: assessmentData.sector,
                content_ids: [this.sessionData.sessionId]
            });
        }

        // LinkedIn Conversion
        if (typeof window.lintrk !== 'undefined') {
            window.lintrk('track', { conversion_id: 12345 });
        }

        // Custom tracking
        this.trackCustomEvent('assessment_complete', { assessmentData, leadScore, ...eventData });
        this.log('Assessment completion tracked', { leadScore, eventData });

        // Track complete funnel
        this.trackFunnelComplete('assessment', leadScore.total);
    }

    trackPDFDownload(filename, assessmentData) {
        const eventData = {
            event_category: 'pdf',
            event_label: 'download',
            file_name: filename,
            custom_parameter_1: assessmentData.sector,
            session_id: this.sessionData.sessionId
        };

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'file_download', {
                file_name: filename,
                file_extension: 'pdf',
                link_url: filename,
                ...eventData
            });
        }

        // Facebook Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', 'ViewContent', {
                content_name: 'pdf_download',
                content_type: 'pdf',
                content_category: assessmentData.sector
            });
        }

        // Custom tracking
        this.trackCustomEvent('pdf_download', { filename, ...eventData });
        this.log('PDF download tracked', { filename });
    }

    trackButtonClick(type, text) {
        const eventData = {
            event_category: 'button',
            event_label: 'click',
            button_type: type,
            button_text: text,
            session_id: this.sessionData.sessionId
        };

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'click', eventData);
        }

        // Custom tracking
        this.trackCustomEvent('button_click', eventData);
    }

    trackError(errorType, errorMessage, context = {}) {
        const eventData = {
            event_category: 'error',
            event_label: errorType,
            error_message: errorMessage,
            session_id: this.sessionData.sessionId,
            ...context
        };

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                description: `${errorType}: ${errorMessage}`,
                fatal: false,
                ...eventData
            });
        }

        // Custom tracking
        this.trackCustomEvent('error', eventData);
        this.log('Error tracked', { errorType, errorMessage, context });
    }

    trackFunnelStep(funnelName, step, totalSteps) {
        const eventData = {
            event_category: 'funnel',
            event_label: funnelName,
            funnel_step: step,
            funnel_total_steps: totalSteps,
            funnel_progress: Math.round((step / totalSteps) * 100),
            session_id: this.sessionData.sessionId
        };

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'funnel_step', eventData);
        }

        // Custom tracking
        this.trackCustomEvent('funnel_step', eventData);
    }

    trackFunnelComplete(funnelName, value = 0) {
        const eventData = {
            event_category: 'funnel',
            event_label: 'completion',
            funnel_name: funnelName,
            funnel_value: value,
            session_id: this.sessionData.sessionId
        };

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'funnel_complete', eventData);
        }

        // Custom tracking
        this.trackCustomEvent('funnel_complete', eventData);
    }

    trackABTest(testName, variant) {
        const eventData = {
            event_category: 'ab_test',
            event_label: testName,
            test_variant: variant,
            session_id: this.sessionData.sessionId
        };

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('config', this.config.ga4, {
                custom_map: { 'custom_parameter_4': 'ab_test_variant' },
                custom_parameter_4: variant
            });
            gtag('event', 'ab_test', eventData);
        }

        // Custom tracking
        this.trackCustomEvent('ab_test', eventData);
        this.log('A/B test tracked', { testName, variant });
    }

    trackPageHide() {
        this.sessionData.hideTime = Date.now();
        this.trackCustomEvent('page_hide', {
            session_id: this.sessionData.sessionId,
            time_on_page: Date.now() - this.sessionData.startTime
        });
    }

    trackPageShow() {
        if (this.sessionData.hideTime) {
            const hideDuration = Date.now() - this.sessionData.hideTime;
            this.trackCustomEvent('page_show', {
                session_id: this.sessionData.sessionId,
                hide_duration: hideDuration
            });
        }
    }

    trackSessionEnd() {
        const sessionDuration = Date.now() - this.sessionData.startTime;
        
        const eventData = {
            event_category: 'session',
            event_label: 'end',
            session_duration: sessionDuration,
            session_id: this.sessionData.sessionId,
            events_count: this.sessionData.events.length
        };

        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'session_end', eventData);
        }

        // Custom tracking
        this.trackCustomEvent('session_end', eventData);
        this.saveSessionData();
    }

    trackCustomEvent(eventName, eventData) {
        const event = {
            name: eventName,
            data: eventData,
            timestamp: Date.now()
        };

        this.sessionData.events.push(event);

        // Store in localStorage for offline analysis
        try {
            const customEvents = JSON.parse(localStorage.getItem('flowmaster_analytics') || '[]');
            customEvents.push(event);
            
            // Keep only last 1000 events
            if (customEvents.length > 1000) {
                customEvents.splice(0, customEvents.length - 1000);
            }
            
            localStorage.setItem('flowmaster_analytics', JSON.stringify(customEvents));
        } catch (error) {
            console.error('Error storing analytics event:', error);
        }
    }

    calculateLeadScore(assessmentData) {
        // Simplified lead scoring for analytics
        let score = 50;
        
        if (assessmentData.werknemers === '51-250') score += 40;
        if (assessmentData.werknemers === '250+') score += 50;
        if (['machinebouw', 'hightech'].includes(assessmentData.sector)) score += 30;
        
        return { total: score, grade: score > 120 ? 'A' : score > 80 ? 'B' : 'C' };
    }

    generateSessionId() {
        return 'fmp4_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    isThrottled(key, interval) {
        const now = Date.now();
        const lastTime = this.throttleCache?.[key] || 0;
        
        if (now - lastTime < interval) {
            return true;
        }
        
        this.throttleCache = this.throttleCache || {};
        this.throttleCache[key] = now;
        return false;
    }

    saveSessionData() {
        try {
            localStorage.setItem('flowmaster_session', JSON.stringify(this.sessionData));
        } catch (error) {
            console.error('Error saving session data:', error);
        }
    }

    log(message, data = null) {
        if (this.config.debug) {
            console.log(`[FlowMaster Analytics] ${message}`, data);
        }
    }

    // Public API methods
    getSessionData() {
        return { ...this.sessionData };
    }

    getStoredEvents() {
        try {
            return JSON.parse(localStorage.getItem('flowmaster_analytics') || '[]');
        } catch (error) {
            console.error('Error loading stored events:', error);
            return [];
        }
    }

    clearStoredData() {
        localStorage.removeItem('flowmaster_analytics');
        localStorage.removeItem('flowmaster_session');
        this.sessionData.events = [];
    }

    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsTracker;
}

// Global instance for direct HTML usage
if (typeof window !== 'undefined') {
    window.AnalyticsTracker = AnalyticsTracker;
}