/**
 * Netlify Function for token generation
 * Handles /api/token endpoint
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REALTIME_SESSIONS_ENDPOINT = "https://api.openai.com/v1/realtime/sessions";

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY environment variable is required");
}

// Rate limiting storage (in-memory, resets on cold start)
const rateLimitStore = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const limit = rateLimitStore.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (limit.count >= 60) {
    return false;
  }

  limit.count++;
  return true;
}

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": event.headers.origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json"
  };

  // Handle OPTIONS (CORS preflight)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  // Get client IP for rate limiting
  const clientIp = event.headers["x-nf-client-connection-ip"] ||
                   event.headers["client-ip"] ||
                   "unknown";

  // Check rate limit
  if (!checkRateLimit(clientIp)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: "Too many requests, please try again later." })
    };
  }

  console.log(`[Netlify Function] ${event.httpMethod} ${event.path}`);

  // Health check
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: "ok", timestamp: new Date().toISOString() })
    };
  }

  // Token endpoint
  if (event.httpMethod === "POST") {
    try {
      if (!OPENAI_API_KEY) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "OpenAI API key not configured" })
        };
      }

      const body = JSON.parse(event.body || "{}");
      const { voice = "alloy", language = "en" } = body;

      // Validate inputs
      const validVoices = ["alloy", "echo", "shimmer", "verse"];
      const validLanguages = ["en", "fr"];

      if (!validVoices.includes(voice)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Invalid voice. Must be one of: ${validVoices.join(", ")}` })
        };
      }

      if (!validLanguages.includes(language)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Invalid language. Must be one of: ${validLanguages.join(", ")}` })
        };
      }

      // Get SFMC instructions
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

      const response = await fetch(REALTIME_SESSIONS_ENDPOINT, {
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
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({
            error: "Failed to generate ephemeral token",
            details: errorText
          })
        };
      }

      const data = await response.json();

      if (!data.client_secret?.value) {
        console.error("❌ No client_secret in response:", data);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Invalid token response from OpenAI" })
        };
      }

      console.log(`✅ Generated ephemeral token: ${data.client_secret.value.substring(0, 10)}...`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          token: data.client_secret.value,
          expiresAt: data.client_secret.expires_at || Date.now() + 1800000
        })
      };

    } catch (error) {
      console.error("❌ Error generating token:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Internal server error",
          message: error.message || "Unknown error"
        })
      };
    }
  }

  // 404 for unknown routes
  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: "Not found", path: event.path, method: event.httpMethod })
  };
};
