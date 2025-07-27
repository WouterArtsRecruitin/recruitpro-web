/**
 * FlowMaster Pro V4 - PDF Generator Component
 * Professional PDF rapport generator voor assessment resultaten
 * 
 * Features:
 * - jsPDF integration
 * - Professional branded layout
 * - Dynamic content rendering
 * - Lead scoring visualizations
 * - Error handling & fallbacks
 * - Google Drive sync capability
 * 
 * Usage:
 * const pdfGen = new PDFGenerator();
 * const filename = pdfGen.generateReport(assessmentData);
 */

class PDFGenerator {
    constructor(options = {}) {
        this.googleDriveAccount = options.googleDriveAccount || 'artsrecruitin@gmail.com';
        this.brandColors = {
            primary: '#1E3A8A',
            secondary: '#FF6B35',
            accent: '#10B981',
            gray: '#374151'
        };
        this.loadJSPDF();
    }

    loadJSPDF() {
        if (typeof window !== 'undefined' && !window.jsPDF) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                console.log('jsPDF loaded successfully');
            };
            document.head.appendChild(script);
        }
    }

    generateReport(assessmentData) {
        try {
            if (!window.jsPDF) {
                throw new Error('jsPDF not loaded');
            }

            const { jsPDF } = window.jsPDF;
            const doc = new jsPDF();

            // Generate PDF content
            this.addHeader(doc, assessmentData);
            this.addCompanyInfo(doc, assessmentData);
            this.addAssessmentResults(doc, assessmentData);
            this.addRecommendations(doc, assessmentData);
            this.addFooter(doc);

            // Generate filename
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            const companyName = (assessmentData.bedrijfsnaam || 'Bedrijf').replace(/[^a-zA-Z0-9]/g, '');
            const filename = `FlowMaster-Rapport-${companyName}-${timestamp}.pdf`;

            // Save PDF
            doc.save(filename);

            // Sync to Google Drive if configured
            this.syncToGoogleDrive(doc, filename);

            return filename;

        } catch (error) {
            console.error('PDF Generation Error:', error);
            this.showError('Er is een fout opgetreden bij het genereren van het PDF rapport.');
            return null;
        }
    }

    addHeader(doc, data) {
        // Brand header with gradient background simulation
        doc.setFillColor(30, 58, 138); // Primary blue
        doc.rect(0, 0, 210, 35, 'F');

        // Company logo area (placeholder)
        doc.setFillColor(255, 255, 255);
        doc.rect(15, 8, 20, 20, 'F');
        doc.setTextColor(30, 58, 138);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('FM', 22, 20);

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('FlowMaster Pro V4', 45, 18);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Advanced Recruitment Intelligence Report', 45, 26);

        // Date
        doc.setFontSize(10);
        const date = new Date().toLocaleDateString('nl-NL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(`Gegenereerd op: ${date}`, 140, 20);
    }

    addCompanyInfo(doc, data) {
        let yPos = 50;

        // Company Info Section
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Bedrijfsinformatie', 20, yPos);

        yPos += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        const companyInfo = [
            ['Bedrijfsnaam:', data.bedrijfsnaam || 'Niet opgegeven'],
            ['Sector:', this.getSectorName(data.sector)],
            ['Aantal werknemers:', data.werknemers || 'Niet opgegeven'],
            ['Contactpersoon:', data.contact?.naam || 'Niet opgegeven'],
            ['E-mail:', data.contact?.email || 'Niet opgegeven'],
            ['Telefoon:', data.contact?.telefoon || 'Niet opgegeven']
        ];

        companyInfo.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 70, yPos);
            yPos += 7;
        });
    }

    addAssessmentResults(doc, data) {
        let yPos = 130;

        // Assessment Results Section
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Assessment Resultaten', 20, yPos);

        yPos += 15;

        // Lead Score
        const leadScore = this.calculateLeadScore(data);
        this.addScoreVisualization(doc, 20, yPos, leadScore);

        yPos += 40;

        // Sector-specific insights
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Sector Analyse', 20, yPos);

        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const sectorInsights = this.getSectorInsights(data.sector);
        const lines = doc.splitTextToSize(sectorInsights, 170);
        lines.forEach(line => {
            doc.text(line, 20, yPos);
            yPos += 5;
        });
    }

    addScoreVisualization(doc, x, y, score) {
        // Score circle
        const radius = 15;
        const centerX = x + radius;
        const centerY = y + radius;

        // Background circle
        doc.setFillColor(240, 240, 240);
        doc.circle(centerX, centerY, radius, 'F');

        // Score arc (simplified - would need complex calculations for actual arc)
        const percentage = score.total / 300;
        if (percentage > 0.8) {
            doc.setFillColor(16, 185, 129); // Green
        } else if (percentage > 0.6) {
            doc.setFillColor(245, 158, 11); // Yellow
        } else {
            doc.setFillColor(239, 68, 68); // Red
        }
        
        doc.circle(centerX, centerY, radius * 0.8, 'F');

        // Score text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(score.total.toString(), centerX - 5, centerY + 2);

        // Score details
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Lead Score: ${score.total}/300`, x + 40, y + 8);
        doc.text(`Classificatie: ${score.grade}`, x + 40, y + 18);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`• Bedrijfsgrootte: ${score.sizeScore} punten`, x + 40, y + 28);
        doc.text(`• Sector complexiteit: ${score.sectorScore} punten`, x + 40, y + 35);
    }

    addRecommendations(doc, data) {
        let yPos = 220;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Aanbevelingen', 20, yPos);

        yPos += 15;

        const recommendations = this.generateRecommendations(data);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        recommendations.forEach((rec, index) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${index + 1}. ${rec.title}`, 20, yPos);
            yPos += 7;
            
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(rec.description, 170);
            lines.forEach(line => {
                doc.text(line, 25, yPos);
                yPos += 5;
            });
            yPos += 3;
        });
    }

    addFooter(doc) {
        const pageHeight = 297; // A4 height in mm
        const footerY = pageHeight - 20;

        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        doc.text('FlowMaster Pro V4 - Advanced Recruitment Intelligence Platform', 20, footerY);
        doc.text(`Google Drive Sync: ${this.googleDriveAccount}`, 20, footerY + 5);
        doc.text('© 2024 RecruitIn - Alle rechten voorbehouden', 20, footerY + 10);
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

        // Assessment completeness (base score)
        const baseScore = 50;

        const total = baseScore + sizeScore + sectorScore;
        let grade = 'D';
        if (total >= 240) grade = 'A+';
        else if (total >= 200) grade = 'A';
        else if (total >= 160) grade = 'B';
        else if (total >= 120) grade = 'C';

        return {
            total,
            grade,
            sizeScore,
            sectorScore,
            baseScore
        };
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

    getSectorInsights(sectorId) {
        const insights = {
            'bouw': 'De bouwsector toont sterke groei in duurzame bouwprojecten. Er is veel vraag naar ervaren vakmensen met kennis van moderne bouwtechnieken.',
            'installatie': 'Installatietechniek blijft een stabiele sector met groeiende vraag naar klimaat- en energietechniek specialisten.',
            'metaal': 'Metaalbewerking evolueert naar meer geautomatiseerde processen. Ervaring met moderne machines is zeer gewenst.',
            'machinebouw': 'Machinebouw sector groeit door digitalisering en Industry 4.0 ontwikkelingen.',
            'hightech': 'High-tech sector toont explosieve groei. Er is grote vraag naar software ontwikkelaars en technische specialisten.',
            'andere': 'Andere technische sectoren bieden diverse kansen voor gespecialiseerde vakmensen.'
        };
        return insights[sectorId] || 'Sector-specifieke analyse niet beschikbaar.';
    }

    generateRecommendations(data) {
        const score = this.calculateLeadScore(data);
        const recommendations = [];

        if (score.total >= 200) {
            recommendations.push({
                title: 'Premium Service Package',
                description: 'Dit bedrijf komt in aanmerking voor ons premium recruitment pakket met dedicated account management en executive search services.'
            });
        }

        if (data.sector === 'hightech' || data.sector === 'machinebouw') {
            recommendations.push({
                title: 'Gespecialiseerde Technical Recruitment',
                description: 'Focus op technical recruitment met emphasis op moderne technologieën en innovatie in de sector.'
            });
        }

        recommendations.push({
            title: 'Follow-up Strategy',
            description: 'Plan een persoonlijk gesprek binnen 48 uur om de specifieke recruitment behoeften te bespreken en een op maat gemaakt voorstel te presenteren.'
        });

        return recommendations;
    }

    syncToGoogleDrive(doc, filename) {
        try {
            // This would require Google Drive API integration
            // For now, we'll simulate the sync with localStorage
            const pdfData = doc.output('datauristring');
            
            localStorage.setItem(`gdrive_sync_${filename}`, JSON.stringify({
                filename: filename,
                account: this.googleDriveAccount,
                data: pdfData,
                timestamp: new Date().toISOString(),
                synced: false
            }));

            console.log(`PDF queued for Google Drive sync: ${filename}`);
            this.showSuccess(`PDF opgeslagen lokaal en klaargezet voor sync naar ${this.googleDriveAccount}`);

        } catch (error) {
            console.error('Google Drive sync error:', error);
            this.showWarning('PDF gegenereerd, maar Google Drive sync is mislukt.');
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type = 'info') {
        if (typeof window !== 'undefined') {
            // Simple notification system
            const notification = document.createElement('div');
            notification.className = `pdf-notification ${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                max-width: 300px;
                font-size: 14px;
                ${type === 'success' ? 'background: #10B981; color: white;' : ''}
                ${type === 'error' ? 'background: #EF4444; color: white;' : ''}
                ${type === 'warning' ? 'background: #F59E0B; color: white;' : ''}
                ${type === 'info' ? 'background: #3B82F6; color: white;' : ''}
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }

    // Public API methods
    setGoogleDriveAccount(email) {
        this.googleDriveAccount = email;
    }

    getQueuedSyncs() {
        const queued = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('gdrive_sync_')) {
                const data = JSON.parse(localStorage.getItem(key));
                queued.push(data);
            }
        }
        return queued;
    }

    clearSyncQueue() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('gdrive_sync_')) {
                keys.push(key);
            }
        }
        keys.forEach(key => localStorage.removeItem(key));
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}

// Global instance for direct HTML usage
if (typeof window !== 'undefined') {
    window.PDFGenerator = PDFGenerator;
}