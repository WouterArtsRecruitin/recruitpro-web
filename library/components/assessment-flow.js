/**
 * FlowMaster Pro V4 - Assessment Flow Component
 * Herbruikbare assessment flow logica voor recruitment intelligence
 * 
 * Features:
 * - Multi-step vragenlijst flow
 * - Dynamic vraag weergave
 * - Progress tracking
 * - Form validatie
 * - Session storage
 * 
 * Usage:
 * const assessmentFlow = new AssessmentFlow({
 *   container: '#assessment-container',
 *   onComplete: (data) => { console.log('Assessment complete:', data) }
 * });
 */

class AssessmentFlow {
    constructor(options = {}) {
        this.container = document.querySelector(options.container || '#assessment-container');
        this.onComplete = options.onComplete || (() => {});
        this.currentStep = 1;
        this.maxSteps = 10;
        this.assessmentData = {
            bedrijfsnaam: '',
            sector: '',
            werknemers: '',
            contact: {
                naam: '',
                email: '',
                telefoon: ''
            },
            antwoorden: {},
            startTime: new Date().toISOString()
        };
        
        this.init();
    }

    init() {
        this.loadStoredData();
        this.renderCurrentStep();
        this.attachEventListeners();
    }

    loadStoredData() {
        const stored = sessionStorage.getItem('flowmasterAssessment');
        if (stored) {
            this.assessmentData = { ...this.assessmentData, ...JSON.parse(stored) };
        }
    }

    saveData() {
        sessionStorage.setItem('flowmasterAssessment', JSON.stringify(this.assessmentData));
    }

    renderCurrentStep() {
        if (!this.container) return;

        const stepConfig = this.getStepConfig(this.currentStep);
        this.container.innerHTML = this.generateStepHTML(stepConfig);
        this.updateProgressBar();
    }

    getStepConfig(step) {
        const steps = {
            1: {
                title: 'Bedrijfsinformatie',
                subtitle: 'Vertel ons over je bedrijf',
                fields: [
                    { type: 'text', name: 'bedrijfsnaam', label: 'Bedrijfsnaam', required: true },
                    { type: 'select', name: 'werknemers', label: 'Aantal werknemers', required: true, options: [
                        { value: '1-10', label: '1-10 werknemers' },
                        { value: '11-50', label: '11-50 werknemers' },
                        { value: '51-250', label: '51-250 werknemers' },
                        { value: '250+', label: '250+ werknemers' }
                    ]}
                ]
            },
            2: {
                title: 'Sector Selectie',
                subtitle: 'In welke technische sector ben je actief?',
                type: 'sector-selection'
            },
            // Add more step configurations...
        };
        
        return steps[step] || steps[1];
    }

    generateStepHTML(config) {
        if (config.type === 'sector-selection') {
            return this.generateSectorSelectionHTML();
        }
        
        return `
            <div class="step-container">
                <div class="step-header">
                    <h2 class="step-title">${config.title}</h2>
                    <p class="step-subtitle">${config.subtitle}</p>
                </div>
                <form class="step-form">
                    ${config.fields.map(field => this.generateFieldHTML(field)).join('')}
                    <div class="step-actions">
                        ${this.currentStep > 1 ? '<button type="button" class="btn-secondary" onclick="assessmentFlow.previousStep()">Vorige</button>' : ''}
                        <button type="submit" class="btn-primary">Volgende</button>
                    </div>
                </form>
            </div>
        `;
    }

    generateSectorSelectionHTML() {
        const sectors = [
            { id: 'bouw', title: 'Bouw & Constructie', icon: '🏗️', description: 'Bouwprojecten, constructie, infrastructuur' },
            { id: 'installatie', title: 'Installatietechniek (W/E/Klimaat)', icon: '⚡', description: 'Elektro, loodgieter, HVAC, klimaattechniek' },
            { id: 'metaal', title: 'Metaalbewerking & Industrie', icon: '🔧', description: 'Lassen, bewerking, industriële productie' },
            { id: 'machinebouw', title: 'Machinebouw & Equipment', icon: '⚙️', description: 'Machines, apparaten, technische systemen' },
            { id: 'hightech', title: 'High-tech & Elektronica', icon: '💻', description: 'Elektronica, software, innovatie' },
            { id: 'andere', title: 'Andere technische sector', icon: '📦', description: 'Overige technische specialisaties' }
        ];

        return `
            <div class="step-container">
                <div class="step-header">
                    <h2 class="step-title">Sector Selectie</h2>
                    <p class="step-subtitle">In welke technische sector ben je actief?</p>
                </div>
                <div class="sector-grid">
                    ${sectors.map(sector => `
                        <div class="sector-card" data-sector="${sector.id}">
                            <div class="sector-icon">${sector.icon}</div>
                            <h3 class="sector-title">${sector.title}</h3>
                            <p class="sector-description">${sector.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateFieldHTML(field) {
        if (field.type === 'select') {
            return `
                <div class="field-group">
                    <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
                    <select name="${field.name}" id="${field.name}" ${field.required ? 'required' : ''}>
                        <option value="">Selecteer...</option>
                        ${field.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                    </select>
                </div>
            `;
        }
        
        return `
            <div class="field-group">
                <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
                <input type="${field.type}" name="${field.name}" id="${field.name}" ${field.required ? 'required' : ''} />
            </div>
        `;
    }

    attachEventListeners() {
        if (!this.container) return;

        // Form submission
        const form = this.container.querySelector('.step-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(e.target);
            });
        }

        // Sector selection
        const sectorCards = this.container.querySelectorAll('.sector-card');
        sectorCards.forEach(card => {
            card.addEventListener('click', () => {
                this.handleSectorSelection(card.dataset.sector);
            });
        });
    }

    handleFormSubmit(form) {
        const formData = new FormData(form);
        
        // Validate and store form data
        for (let [key, value] of formData.entries()) {
            if (key.startsWith('contact.')) {
                const contactKey = key.split('.')[1];
                this.assessmentData.contact[contactKey] = value;
            } else {
                this.assessmentData[key] = value;
            }
        }

        this.saveData();
        this.nextStep();
    }

    handleSectorSelection(sectorId) {
        this.assessmentData.sector = sectorId;
        this.saveData();
        this.nextStep();
    }

    nextStep() {
        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.renderCurrentStep();
        } else {
            this.completeAssessment();
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.renderCurrentStep();
        }
    }

    updateProgressBar() {
        const progressBar = document.querySelector('.progress-fill');
        if (progressBar) {
            const percentage = (this.currentStep / this.maxSteps) * 100;
            progressBar.style.width = `${percentage}%`;
        }
    }

    completeAssessment() {
        this.assessmentData.completedAt = new Date().toISOString();
        this.assessmentData.duration = this.calculateDuration();
        this.saveData();
        this.onComplete(this.assessmentData);
    }

    calculateDuration() {
        const start = new Date(this.assessmentData.startTime);
        const end = new Date();
        return Math.round((end - start) / 1000); // seconds
    }

    // Public API methods
    getCurrentData() {
        return { ...this.assessmentData };
    }

    resetAssessment() {
        sessionStorage.removeItem('flowmasterAssessment');
        this.currentStep = 1;
        this.assessmentData = {
            bedrijfsnaam: '',
            sector: '',
            werknemers: '',
            contact: { naam: '', email: '', telefoon: '' },
            antwoorden: {},
            startTime: new Date().toISOString()
        };
        this.renderCurrentStep();
    }

    jumpToStep(stepNumber) {
        if (stepNumber >= 1 && stepNumber <= this.maxSteps) {
            this.currentStep = stepNumber;
            this.renderCurrentStep();
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssessmentFlow;
}

// Global instance for direct HTML usage
if (typeof window !== 'undefined') {
    window.AssessmentFlow = AssessmentFlow;
}