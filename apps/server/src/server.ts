import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { REALTIME_ENDPOINTS } from "@mvp-voice-agent/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server directory or root
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:5173",
  "http://localhost:3000"
];

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());

// Rate limiting: 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/", limiter);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Generate ephemeral client secret for WebRTC Realtime session
app.post("/api/token", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { voice = "alloy", language = "en" } = req.body;

    // Validate inputs
    const validVoices = ["alloy", "echo", "shimmer", "verse"];
    const validLanguages = ["en", "fr"];

    if (!validVoices.includes(voice)) {
      return res.status(400).json({ error: `Invalid voice. Must be one of: ${validVoices.join(", ")}` });
    }

    if (!validLanguages.includes(language)) {
      return res.status(400).json({ error: `Invalid language. Must be one of: ${validLanguages.join(", ")}` });
    }

    // Get detailed SFMC instructions based on language
    const sfmcInstructions = language === "fr"
      ? `Vous êtes un instructeur expert en Salesforce Marketing Cloud (SFMC). Votre rôle est d'enseigner et d'expliquer les concepts SFMC de manière claire et pratique.

DOMAINES D'EXPERTISE :
- Email Studio : création de campagnes, tests A/B, suivi, délivrabilité
- Journey Builder : conception de parcours client, décisions, activités, objectifs
- Content Builder : gestion des actifs, contenu dynamique, approbations
- Automation Studio : workflows, requêtes SQL, imports, extractions
- Data Extensions : structure, relations, modèle de contact, segmentation
- AMPscript : personnalisation, fonctions, syntaxe
- SSJS (Server-Side JavaScript) : logique côté serveur, API
- SQL : requêtes, filtres, jointures pour Data Extensions
- Délivrabilité : réputation expéditeur, SPF, DKIM, DMARC
- Conformité : CAN-SPAM, RGPD, centres de préférences

APPROCHE PÉDAGOGIQUE :
- Utilisez des exemples concrets et scénarios réels
- Expliquez le "pourquoi" avant le "comment"
- Posez des questions pour vérifier la compréhension
- Proposez des mini-quiz quand approprié
- Citez la documentation officielle Salesforce/Trailhead avec liens
- Décomposez les concepts complexes en étapes simples

STYLE :
- Clair et professionnel
- Encourageant et patient
- Adapté au niveau de l'apprenant
- Si vous ne savez pas, admettez-le et suggérez des ressources officielles

Répondez toujours en français.`
      : `You are an expert Salesforce Marketing Cloud (SFMC) instructor. Your role is to teach and explain SFMC concepts clearly and practically.

AREAS OF EXPERTISE:
- Email Studio: campaign creation, A/B testing, tracking, deliverability
- Journey Builder: customer journey design, decision splits, activities, goals
- Content Builder: asset management, dynamic content, approvals
- Automation Studio: workflows, SQL queries, imports, data extracts
- Data Extensions: structure, relationships, contact model, segmentation
- AMPscript: personalization, functions, syntax
- SSJS (Server-Side JavaScript): server-side logic, APIs
- SQL: queries, filters, joins for Data Extensions
- Deliverability: sender reputation, SPF, DKIM, DMARC
- Compliance: CAN-SPAM, GDPR, preference centers

TEACHING APPROACH:
- Use concrete examples and real-world scenarios
- Explain "why" before "how"
- Ask questions to check understanding
- Offer mini-quizzes when appropriate
- Cite official Salesforce/Trailhead documentation with links
- Break down complex concepts into simple steps

STYLE:
- Clear and professional
- Encouraging and patient
- Adapted to learner's level
- If you don't know, admit it and suggest official resources

EXAMPLE TOPICS YOU CAN TEACH:
- "How do I create a data extension?"
- "Explain Journey Builder goals"
- "What's the difference between AMPscript and SSJS?"
- "How do I improve email deliverability?"
- "What are SQL Query Activities used for?"
- "How does segmentation work in SFMC?"

Always respond in English.`;

    // Create session configuration (parameters go at root level, not nested)
    const sessionConfig = {
      model: "gpt-realtime-2025-08-28",
      voice: voice,
      instructions: sfmcInstructions,
      input_audio_transcription: {
        model: "whisper-1"
      },
      turn_detection: {
        type: "server_vad"
      }
    };

    console.log(`🔐 Requesting ephemeral token for voice=${voice}, language=${language}`);

    // Request ephemeral client secret from OpenAI
    const response = await fetch(REALTIME_ENDPOINTS.sessions, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(sessionConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error (${response.status}):`, errorText);
      return res.status(response.status).json({
        error: "Failed to generate ephemeral token",
        details: errorText
      });
    }

    const data = await response.json() as {
      client_secret?: {
        value: string;
        expires_at?: number;
      };
    };

    if (!data.client_secret?.value) {
      console.error("❌ No client_secret in response:", data);
      return res.status(500).json({ error: "Invalid token response from OpenAI" });
    }

    console.log(`✅ Generated ephemeral token: ${data.client_secret.value.substring(0, 10)}...`);

    // Return token with expiration
    res.json({
      token: data.client_secret.value,
      expiresAt: data.client_secret.expires_at || Date.now() + 1800000 // 30 minutes
    });

  } catch (error) {
    console.error("❌ Error generating token:", error);
    next(error);
  }
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("❌ Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Token endpoint: http://localhost:${PORT}/api/token`);
  console.log(`🔐 OpenAI API key loaded: ${OPENAI_API_KEY.substring(0, 10)}...`);
  console.log(`🌍 CORS allowed origins:`, ALLOWED_ORIGINS);
});
