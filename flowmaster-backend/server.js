const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security & CORS
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5500', 
    'http://127.0.0.1:5500', 
    'http://localhost:3001', 
    'https://celebrated-nasturtium-1d0567.netlify.app',
    'https://recruitmentapk.nl',
    'file://'
  ],
  credentials: true
}));

// Rate limiting - more generous for assessments
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 assessments per 15 minutes
  message: { 
    success: false,
    error: 'Te veel assessments. Probeer over 15 minuten opnieuw.' 
  }
});

app.use('/api/assessment', limiter);
app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request data:', Object.keys(req.body));
  }
  next();
});

// FlowMaster Assessment Analysis endpoint
app.post('/api/assessment/analyze', async (req, res) => {
  try {
    const { 
      bedrijfsnaam, 
      naam, 
      email, 
      telefoon, 
      assessment_data 
    } = req.body;

    // Validate required fields
    if (!assessment_data || typeof assessment_data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Assessment data is verplicht'
      });
    }

    if (!email || !naam) {
      return res.status(400).json({
        success: false,
        error: 'Naam en email zijn verplicht'
      });
    }

    // Calculate score using existing algorithm
    const score = calculateFlowMasterScore(assessment_data);
    
    // Generate AI analysis
    const aiAnalysis = await generateAIAnalysis(assessment_data, score, {
      bedrijfsnaam,
      naam,
      email
    });

    const result = {
      score: score,
      analysis: aiAnalysis,
      participant: {
        bedrijfsnaam,
        naam,
        email,
        telefoon
      },
      timestamp: new Date().toISOString()
    };

    // Send to Zapier (existing working flow)
    await sendToZapier(result);

    res.json({
      success: true,
      data: result,
      message: 'Assessment succesvol geanalyseerd'
    });

  } catch (error) {
    console.error('Assessment analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Er ging iets mis bij de analyse. Probeer het opnieuw.'
    });
  }
});

// Calculate FlowMaster Pro score (19 questions, 5 points each)
function calculateFlowMasterScore(assessmentData) {
  let totalScore = 0;
  let maxScore = 0;
  
  // Process 19 assessment questions
  for (let i = 1; i <= 19; i++) {
    const questionKey = `vraag${i}`;
    if (assessmentData[questionKey]) {
      const value = parseInt(assessmentData[questionKey]);
      if (!isNaN(value) && value >= 1 && value <= 5) {
        totalScore += value;
        maxScore += 5;
      }
    }
  }
  
  // Convert to 0-100 scale
  const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  
  return {
    rawScore: totalScore,
    maxScore: maxScore,
    percentage: finalScore,
    level: getMaturityLevel(finalScore)
  };
}

function getMaturityLevel(score) {
  if (score >= 85) return 'Expert';
  if (score >= 70) return 'Gevorderd';
  if (score >= 55) return 'Gemiddeld';
  if (score >= 40) return 'Basis';
  return 'Starter';
}

// Generate AI analysis using Claude
async function generateAIAnalysis(assessmentData, score, participant) {
  try {
    const prompt = createFlowMasterPrompt(assessmentData, score, participant);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.CLAUDE_API_KEY
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return parseFlowMasterResponse(data.content[0].text);

  } catch (error) {
    console.error('AI Analysis failed:', error);
    return createFallbackAnalysis(score);
  }
}

function createFlowMasterPrompt(assessmentData, score, participant) {
  const questions = [];
  for (let i = 1; i <= 19; i++) {
    const value = assessmentData[`vraag${i}`] || 0;
    questions.push(`Vraag ${i}: ${value}/5`);
  }

  return `Je bent een senior recruitment consultant. Analyseer deze FlowMaster Pro assessment resultaten en geef gepersonaliseerde aanbevelingen.

PARTICIPANT: ${participant.naam} van ${participant.bedrijfsnaam || 'niet opgegeven'}
SCORE: ${score.percentage}/100 (${score.level})

ASSESSMENT RESULTATEN:
${questions.join('\n')}

Geef een professionele analyse in dit JSON format:
{
  "samenvatting": "Korte samenvatting van recruitment maturity",
  "sterke_punten": ["punt 1", "punt 2", "punt 3"],
  "verbeterpunten": ["punt 1", "punt 2", "punt 3"],
  "aanbevelingen": [
    {
      "actie": "Concrete actie",
      "prioriteit": "Hoog/Medium/Laag",
      "tijdsinvestering": "bijv. 2-4 weken",
      "impact": "Verwachte impact beschrijving"
    }
  ],
  "benchmark": {
    "sector_vergelijking": "Boven/Op/Onder gemiddelde",
    "percentiel": "Top 25% / Middenmoot / etc",
    "vergelijkbare_scores": "Andere organisaties met score 70-80"
  },
  "roadmap": {
    "korte_termijn": "0-3 maanden acties",
    "middellange_termijn": "3-12 maanden doelen", 
    "lange_termijn": "1+ jaar visie"
  }
}

Wees specifiek, actionable en motiverend in je feedback.`;
}

function parseFlowMasterResponse(text) {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
    }
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return createFallbackAnalysis();
  }
}

function createFallbackAnalysis(score) {
  return {
    samenvatting: `Je recruitment maturity score is ${score?.percentage || 'onbekend'}/100. Er zijn goede mogelijkheden voor verbetering.`,
    sterke_punten: [
      "Bereidheid tot verbetering getoond",
      "Assessment volledig afgerond", 
      "Bewustzijn van recruitment uitdagingen"
    ],
    verbeterpunten: [
      "Recruitment proces standaardisatie",
      "Data-driven besluitvorming",
      "Kandidaat experience optimalisatie"
    ],
    aanbevelingen: [
      {
        actie: "Implementeer gestructureerde interview processen",
        prioriteit: "Hoog",
        tijdsinvestering: "4-6 weken",
        impact: "Betere kandidaat selectie en hiring success"
      }
    ],
    benchmark: {
      sector_vergelijking: "Gemiddeld niveau",
      percentiel: "Middenmoot",
      vergelijkbare_scores: "Veel organisaties hebben vergelijkbare scores"
    },
    roadmap: {
      korte_termijn: "Focus op quick wins en proces optimalisatie",
      middellange_termijn: "Implementeer recruitment technology en data analytics",
      lange_termijn: "Bouw employer branding en talent pipeline"
    }
  };
}

// Send results to Zapier (existing working integration)
async function sendToZapier(assessmentResult) {
  try {
    const zapierPayload = {
      // Contact info
      bedrijfsnaam: assessmentResult.participant.bedrijfsnaam,
      naam: assessmentResult.participant.naam,
      email: assessmentResult.participant.email,
      telefoon: assessmentResult.participant.telefoon,
      
      // Assessment results
      totaal_score: assessmentResult.score.percentage,
      niveau: assessmentResult.score.level,
      raw_score: assessmentResult.score.rawScore,
      max_score: assessmentResult.score.maxScore,
      
      // AI Analysis
      samenvatting: assessmentResult.analysis.samenvatting,
      sterke_punten: assessmentResult.analysis.sterke_punten?.join(', '),
      verbeterpunten: assessmentResult.analysis.verbeterpunten?.join(', '),
      
      // Metadata
      timestamp: assessmentResult.timestamp,
      source: 'FlowMaster Pro Backend'
    };

    const response = await fetch(process.env.ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zapierPayload)
    });

    console.log('✅ Assessment sent to Zapier:', response.status);
    
  } catch (error) {
    console.error('❌ Failed to send to Zapier:', error);
    // Don't throw - assessment should still work without Zapier
  }
}

// Enhanced assessment endpoint for real-time scoring
app.post('/api/assessment/score', (req, res) => {
  try {
    const { assessment_data } = req.body;
    
    if (!assessment_data) {
      return res.status(400).json({
        success: false,
        error: 'Assessment data required'
      });
    }
    
    const score = calculateFlowMasterScore(assessment_data);
    
    res.json({
      success: true,
      score: score,
      message: 'Score calculated successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Score calculation failed'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'FlowMaster Pro Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/assessment/analyze',
      'POST /api/assessment/score',
      'GET /health'
    ]
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: [
      'POST /api/assessment/analyze',
      'POST /api/assessment/score', 
      'GET /health'
    ]
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
🚀 FlowMaster Pro Backend is live!
📍 URL: http://localhost:${PORT}
🔧 Environment: ${process.env.NODE_ENV}
⏰ Started: ${new Date().toLocaleString('nl-NL')}

🎯 Available endpoints:
   • POST /api/assessment/analyze - Complete assessment analysis
   • POST /api/assessment/score   - Quick score calculation  
   • GET  /health                 - Health check

🔗 Zapier integration: ${process.env.ZAPIER_WEBHOOK_URL ? '✅ Configured' : '❌ Missing'}
🤖 Claude AI: ${process.env.CLAUDE_API_KEY ? '✅ Configured' : '❌ Missing API key'}
  `);
});
