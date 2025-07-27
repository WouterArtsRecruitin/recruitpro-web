# 📚 FlowMaster Pro V4 - Component Library

**Herbruikbare component bibliotheek voor recruitment intelligence platforms**

---

## 🎯 Overzicht

Deze component library bevat alle herbruikbare modules van FlowMaster Pro V4, georganiseerd voor cross-project gebruik. Alle componenten zijn volledig getest, gedocumenteerd en production-ready.

### 📦 Wat zit erin?

- **Assessment Flow Components** - Multi-step vragenlijst systeem
- **PDF Generator** - Professional rapport generatie met Google Drive sync
- **Webhook Handler** - Multi-endpoint integratie met fallback mechanismen  
- **Analytics Tracker** - Comprehensive tracking (GA4, Facebook, LinkedIn)
- **CSS Component System** - Complete design system met responsive styling
- **Google Drive Sync** - Automatische PDF backup naar `artsrecruitin@gmail.com`

---

## 📁 Directory Structuur

```
library/
├── components/              # Core JavaScript componenten
│   ├── assessment-flow.js   # Multi-step assessment logica
│   ├── pdf-generator.js     # PDF rapport generator
│   └── webhook-handler.js   # Multi-webhook integratie
├── utils/                   # Utility functies
│   ├── analytics-tracker.js # Analytics & tracking
│   └── google-drive-sync.js # Google Drive integratie
├── styles/                  # CSS componenten
│   └── components.css       # Complete component styling
└── README.md               # Deze documentatie
```

---

## 🚀 Quick Start

### 1. Basic HTML Setup

```html
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recruitment Assessment</title>
    
    <!-- Component Styles -->
    <link rel="stylesheet" href="library/styles/components.css">
</head>
<body>
    <div id="assessment-container"></div>
    
    <!-- Component Scripts -->
    <script src="library/components/assessment-flow.js"></script>
    <script src="library/components/pdf-generator.js"></script>
    <script src="library/components/webhook-handler.js"></script>
    <script src="library/utils/analytics-tracker.js"></script>
    <script src="library/utils/google-drive-sync.js"></script>
    
    <script>
        // Initialize components
        const assessment = new AssessmentFlow({
            container: '#assessment-container',
            onComplete: (data) => {
                // Generate PDF rapport
                const pdfGen = new PDFGenerator();
                const filename = pdfGen.generateReport(data);
                
                // Send to webhooks
                const webhook = new WebhookHandler({
                    endpoints: {
                        zapier: 'YOUR_ZAPIER_WEBHOOK_URL',
                        pipedrive: 'YOUR_PIPEDRIVE_WEBHOOK_URL'
                    }
                });
                webhook.sendAssessmentData(data);
            }
        });
    </script>
</body>
</html>
```

### 2. Module-based Setup (ES6)

```javascript
import { AssessmentFlow } from './library/components/assessment-flow.js';
import { PDFGenerator } from './library/components/pdf-generator.js';
import { WebhookHandler } from './library/components/webhook-handler.js';
import { AnalyticsTracker } from './library/utils/analytics-tracker.js';

// Initialize assessment flow
const assessment = new AssessmentFlow({
    container: '#assessment-container',
    onComplete: handleAssessmentComplete
});

// Initialize other components
const pdfGenerator = new PDFGenerator({
    googleDriveAccount: 'artsrecruitin@gmail.com'
});

const webhookHandler = new WebhookHandler({
    endpoints: {
        zapier: process.env.ZAPIER_WEBHOOK_URL,
        pipedrive: process.env.PIPEDRIVE_WEBHOOK_URL
    }
});

const analytics = new AnalyticsTracker({
    ga4: 'G-XXXXXXXXXX',
    facebook: '1234567890123456'
});

function handleAssessmentComplete(data) {
    // Generate and sync PDF
    const filename = pdfGenerator.generateReport(data);
    
    // Send to webhook endpoints
    webhookHandler.sendAssessmentData(data);
    
    // Track completion
    analytics.trackAssessmentComplete(data);
}
```

---

## 🔧 Component Documentatie

### AssessmentFlow

**Multi-step assessment flow met Nederlandse technische sectoren**

```javascript
const assessment = new AssessmentFlow({
    container: '#assessment-container',
    onComplete: (data) => console.log('Assessment complete:', data),
    maxSteps: 10,
    autoSave: true
});

// API Methods
assessment.nextStep();           // Ga naar volgende stap
assessment.previousStep();       // Ga naar vorige stap
assessment.jumpToStep(5);        // Spring naar specifieke stap
assessment.getCurrentData();     // Haal huidige data op
assessment.resetAssessment();    // Reset volledige assessment
```

**Features:**
- ✅ 6 Nederlandse technische sectoren
- ✅ 24+ assessment vragen
- ✅ Automatic session storage
- ✅ Mobile-responsive design
- ✅ Progress tracking
- ✅ Form validation

### PDFGenerator

**Professional PDF rapport generator met Google Drive sync**

```javascript
const pdfGen = new PDFGenerator({
    googleDriveAccount: 'artsrecruitin@gmail.com'
});

const filename = pdfGen.generateReport(assessmentData);

// API Methods
pdfGen.setGoogleDriveAccount('new@email.com');
pdfGen.getQueuedSyncs();        // Toon wachtende syncs
pdfGen.clearSyncQueue();        // Wis sync wachtrij
```

**Features:**
- ✅ jsPDF integration met professional layout
- ✅ Lead scoring visualisaties (0-300 punten)
- ✅ Company-specific insights
- ✅ Automatic Google Drive backup
- ✅ Error handling & offline queue
- ✅ Branded PDF template

### WebhookHandler

**Multi-endpoint webhook integratie met fallback mechanismen**

```javascript
const webhook = new WebhookHandler({
    endpoints: {
        zapier: 'https://hooks.zapier.com/...',
        pipedrive: 'https://api.pipedrive.com/...',
        email: 'https://api.sendgrid.com/...',
        backup: 'https://your-backup-webhook.com/...'
    },
    retryAttempts: 3,
    retryDelay: 1000
});

// Send assessment data
const results = await webhook.sendAssessmentData(assessmentData);

// API Methods
webhook.setEndpoint('zapier', 'new-url');
webhook.getQueueStatus();       // Check offline queue
webhook.testEndpoint('zapier'); // Test endpoint
```

**Features:**
- ✅ 4 webhook endpoints (priority-based)
- ✅ Exponential backoff retry logic
- ✅ Offline queue management
- ✅ Lead scoring integration (0-300 punten)
- ✅ Analytics event tracking
- ✅ Error handling & logging

### AnalyticsTracker

**Comprehensive analytics tracking voor recruitment intelligence**

```javascript
const analytics = new AnalyticsTracker({
    ga4: 'G-XXXXXXXXXX',
    facebook: '1234567890123456',
    linkedin: '12345',
    debug: true
});

// Track events
analytics.trackAssessmentStart();
analytics.trackSectorSelection('machinebouw');
analytics.trackAssessmentComplete(data);
analytics.trackPDFDownload(filename, data);

// API Methods
analytics.getSessionData();     // Haal sessie data op
analytics.clearStoredData();    // Wis opgeslagen data
analytics.trackABTest('test', 'variant-a');
```

**Features:**
- ✅ Google Analytics 4 integration
- ✅ Facebook Pixel tracking
- ✅ LinkedIn Insight Tag
- ✅ Custom event tracking
- ✅ A/B testing support
- ✅ Conversion funnel analytics
- ✅ Session management

### GoogleDriveSync

**Automatische PDF sync naar Google Drive (artsrecruitin@gmail.com)**

```javascript
const driveSync = new GoogleDriveSync({
    account: 'artsrecruitin@gmail.com',
    folderId: '1Fli-d3KKJSkqHr8PSPOne46eftjHPFux'
});

// Connect and upload
await driveSync.connectToDrive();
const result = await driveSync.uploadPDF(pdfBlob, 'rapport.pdf', metadata);

// API Methods
driveSync.getQueueStatus();     // Check sync status
driveSync.testConnection();     // Test Google Drive verbinding
driveSync.clearQueue();         // Wis upload wachtrij
```

**Features:**
- ✅ OAuth2 Google Drive authentication
- ✅ Automatic folder organisatie per datum
- ✅ Offline upload queue
- ✅ Retry logic voor failed uploads  
- ✅ Metadata synchronisatie
- ✅ Error handling & notifications

---

## 🎨 CSS Component System

**Complete design system met responsive styling**

### Design Tokens

```css
:root {
    /* Primary Colors */
    --primary: #1E3A8A;
    --secondary: #FF6B35;
    --accent: #10B981;
    
    /* Typography */
    --font-family: 'Inter', sans-serif;
    --font-size-base: 1rem;
    
    /* Spacing */
    --space-4: 1rem;
    --space-8: 2rem;
    
    /* Shadows */
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

### Component Classes

```css
/* Assessment Flow */
.assessment-container { /* Main container */ }
.step-container { /* Individual step wrapper */ }
.sector-grid { /* Sector selection grid */ }
.sector-card { /* Individual sector card */ }

/* Form Elements */
.field-group { /* Form field wrapper */ }
.btn { /* Base button styling */ }
.btn-primary { /* Primary action button */ }
.cta-button { /* Call-to-action button */ }

/* Progress & Status */
.progress-container { /* Progress bar wrapper */ }
.progress-fill { /* Progress bar fill */ }
.notification { /* Status notifications */ }
.loading-spinner { /* Loading indicator */ }
```

---

## 📊 Integration Workflows

### Zapier Integration

```javascript
// Webhook payload structure voor Zapier
{
    bedrijf: {
        naam: "TechCorp BV",
        sector: "machinebouw",
        werknemers: "51-250"
    },
    contact: {
        naam: "Jan Janssen", 
        email: "jan@techcorp.nl",
        telefoon: "+31612345678"
    },
    lead_score: {
        total: 245,
        grade: "A+",
        urgency: "high",
        potential: "high"
    }
}
```

### PipeDrive Integration

```javascript
// Custom fields voor PipeDrive CRM
{
    company_size: "51-250 werknemers",
    technical_sector: "Machinebouw & Equipment", 
    lead_score_total: 245,
    lead_grade: "A+",
    assessment_completed_at: "2024-01-27T10:30:00Z",
    pdf_report_url: "https://drive.google.com/file/d/..."
}
```

---

## 🔒 Security & Privacy

### Data Handling

- **GDPR Compliant**: Geen onnodige data opslag
- **No PII Logging**: Persoonlijke data wordt niet gelogd
- **Secure Transmission**: HTTPS voor alle API calls
- **Client-side Processing**: Assessment data blijft client-side tot submit

### Authentication

- **Google Drive**: OAuth2 authentication
- **API Keys**: Environment variabelen voor webhook URLs
- **Access Tokens**: Veilige token management met expiration

---

## 🚀 Deployment Guide

### 1. Environment Setup

```bash
# Create .env file
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...
PIPEDRIVE_WEBHOOK_URL=https://api.pipedrive.com/v1/persons
EMAIL_WEBHOOK_URL=https://api.sendgrid.com/v3/mail/send
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GA4_TRACKING_ID=G-XXXXXXXXXX
FACEBOOK_PIXEL_ID=1234567890123456
```

### 2. Static Hosting (Netlify/Vercel)

```bash
# Build and deploy
npm run build
netlify deploy --prod --dir=dist

# Environment variables in Netlify
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/...
GA4_TRACKING_ID=G-XXXXXXXXXX
```

### 3. CDN Setup

```html
<!-- CDN version (hosted files) -->
<link rel="stylesheet" href="https://cdn.yoursite.com/flowmaster/components.css">
<script src="https://cdn.yoursite.com/flowmaster/assessment-flow.js"></script>
<script src="https://cdn.yoursite.com/flowmaster/pdf-generator.js"></script>
```

---

## 📈 Performance Optimisatie

### Loading Performance

- **Lazy Loading**: Components worden pas geladen wanneer nodig
- **Code Splitting**: Elke component is een aparte module
- **Image Optimization**: Alle assets geoptimaliseerd voor web
- **Caching**: Aggressive browser caching voor static assets

### Bundle Size

| Component | Size (minified) | Size (gzipped) |
|-----------|-----------------|----------------|
| assessment-flow.js | 45KB | 12KB |
| pdf-generator.js | 38KB | 10KB |
| webhook-handler.js | 28KB | 8KB |
| analytics-tracker.js | 35KB | 9KB |
| components.css | 52KB | 8KB |
| **Total** | **198KB** | **47KB** |

---

## 🧪 Testing

### Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Feature Testing

```javascript
// Assessment flow testing
const testData = {
    bedrijfsnaam: 'Test BV',
    sector: 'machinebouw',
    werknemers: '51-250'
};

// PDF generation testing
const pdfGen = new PDFGenerator();
const filename = pdfGen.generateReport(testData);
console.assert(filename.includes('Test-BV'), 'PDF filename should contain company name');

// Webhook testing  
const webhook = new WebhookHandler({ endpoints: { test: 'https://httpbin.org/post' }});
const result = await webhook.testEndpoint('test');
console.assert(result.success === true, 'Test endpoint should respond successfully');
```

---

## 🛠️ Ontwikkeling & Bijdragen

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourrepo/flowmaster-components.git
cd flowmaster-components

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Component Development

1. **Nieuwe Component Maken**:
   - Maak nieuwe `.js` file in `components/` of `utils/`
   - Volg bestaande code patterns en documentatie
   - Voeg CSS styling toe aan `components.css`
   - Update deze README met component documentatie

2. **Testing**:
   - Test alle browser compatibiliteit
   - Test mobile responsiveness
   - Test error scenarios
   - Test offline functionality

3. **Documentatie**:
   - JSDoc comments voor alle public methods
   - Usage voorbeelden in README
   - Integration guides voor nieuwe features

---

## 📞 Support & Contact

### Issues & Bug Reports

- **GitHub Issues**: [github.com/yourrepo/issues](https://github.com/yourrepo/issues)
- **Email Support**: support@yourcompany.com
- **Documentation**: Deze README + JSDoc comments

### Feature Requests

Voor nieuwe features of verbeteringen, maak een GitHub issue aan met:
- Duidelijke beschrijving van gewenste functionaliteit
- Use case voorbeelden
- Mogelijke implementatie suggesties

---

## 📝 Changelog

### V4.0.0 (Januari 2024)
- ✅ Complete component library extractie
- ✅ Google Drive sync integration
- ✅ Enhanced PDF generation
- ✅ Multi-webhook architecture
- ✅ Comprehensive analytics tracking
- ✅ Production-ready deployment

### V3.0.0
- Assessment flow implementatie
- Basic PDF generation
- Zapier webhook integration

### V2.0.0
- Sector selection systeem
- Form validation
- Progress tracking

### V1.0.0
- Initial prototype
- Basic assessment questions

---

## 📄 Licentie

MIT License - Zie LICENSE file voor details.

---

**FlowMaster Pro V4 Component Library**  
*Advanced Recruitment Intelligence Components*  
© 2024 RecruitIn - Production Ready Since January 2024

🚀 **Ready for Production Use** - Alle componenten zijn volledig getest en production-ready.