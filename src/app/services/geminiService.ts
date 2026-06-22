// ============================================================
// Fit Tracker PRO — Gemini AI Service
//
// Sends chat + vision requests to Google's Gemini API
// (generateContent). Users provide their own free Gemini API
// key, stored in localStorage — get one with no credit card at:
//   https://aistudio.google.com/apikey
//
// MODEL: 'gemini-2.5-flash' — multimodal (text + image), and on
// Google's free tier as of 2026 (~10 req/min, 250 req/day, no
// billing required). If you hit daily limits, you can swap the
// constant below to 'gemini-2.5-flash-lite' for a higher free
// daily quota (~1,000 req/day) at slightly lower quality, or to
// a newer Flash model as Google releases one — the request/
// response shape used here is stable across Flash versions.
//
// Falls back to curated mock responses when no key is set, so
// the app is fully usable in "Demo Mode" with zero setup.
// ============================================================
import type { ChatMessage } from '../types';

const GEMINI_MODEL = 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const STORAGE_KEY = 'fit_gemini_api_key';

const SYSTEM_PROMPT = `You are FitBot, an elite AI personal trainer and nutritionist for Fit Tracker PRO.
You help users with:
- Creating personalized workout plans
- Building custom meal/diet plans
- Giving expert fitness advice
- Motivating and supporting users on their fitness journey
- Explaining exercises and proper form

You will often be given a block of the user's real, current fitness data (today's nutrition, workout streak, weekly progress, etc.). Use it to make your advice specific and personalized — reference their actual numbers (e.g. "you've got about 450 calories left today" or "nice, that's a 5-day streak!") instead of giving generic answers. Don't just repeat the data back to them as a list.

Keep responses concise, motivating, and actionable. Do not use emoji in your responses.`;

// ─── Mock responses for demo (no API key required) ──────────────────────────
const MOCK_RESPONSES: Record<string, string> = {
  workout: `Here is a 4-day hypertrophy split built around compound movements.\n\n**Day 1 — Push (Chest / Shoulders / Triceps)**\n- Bench Press: 4×8 @ 75% 1RM\n- Overhead Press: 3×10\n- Incline Dumbbell Press: 3×12\n- Lateral Raises: 3×15\n- Tricep Pushdowns: 3×12\n\n**Day 2 — Pull (Back / Biceps)**\n- Deadlift: 4×5 @ 80% 1RM\n- Pull-ups: 4×8\n- Barbell Rows: 3×10\n- Face Pulls: 3×15\n- Hammer Curls: 3×12\n\n**Day 3 — Rest or Light Cardio**\n\n**Day 4 — Legs**\n- Back Squat: 5×5 @ 80% 1RM\n- Romanian Deadlift: 3×10\n- Leg Press: 3×12\n- Walking Lunges: 3×10 each leg\n- Calf Raises: 4×20\n\nRest 2–3 minutes between heavy compound sets. Progressive overload every 1–2 weeks is the key driver of adaptation.`,

  diet: `Here is a structured high-protein meal plan for muscle building.\n\n**Daily Targets:** 2,800 kcal | 200g protein | 300g carbs | 80g fat\n\n**Meal 1 — Breakfast**\n- Scrambled eggs (4 whole) + 2 egg whites\n- 80g oatmeal with berries\n- 1 banana\n\n**Meal 2 — Pre-Workout**\n- 200g Greek yogurt (plain)\n- 1 apple + 30g almonds\n\n**Meal 3 — Post-Workout**\n- 200g chicken breast\n- 150g brown rice (cooked)\n- 100g broccoli, olive oil\n\n**Meal 4 — Dinner**\n- 200g salmon fillet\n- 1 medium sweet potato\n- Mixed greens salad\n\n**Meal 5 — Evening**\n- 150g cottage cheese\n\nTarget 3–4L of water per day. Adjust portions if weight is not moving in the right direction after 2 weeks.`,

  motivation: `Motivation follows action — not the other way around. The days you train without wanting to are the sessions that build real discipline.\n\nFocus on the process:\n- Progress over perfection\n- Consistency beats intensity\n- Small wins accumulate into significant results\n\nSchedule your next session now, set the alarm, and show up. The feeling you want comes after — not before.`,

  default: `I am FitBot, your AI personal trainer. Here is what I can help you with:\n\n**Workout programming** — tell me your goals, available equipment, and weekly schedule and I will build a structured plan.\n\n**Nutrition guidance** — share your calorie target and dietary preferences and I will design a meal framework.\n\n**Progress analysis** — describe what is and is not working and I will identify adjustments.\n\n**Form and technique** — ask about any exercise and I will explain the movement mechanics and common errors.\n\nWhat would you like to work on?`,
};

function getMockResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('workout') || lower.includes('exercise') || lower.includes('train')) {
    return MOCK_RESPONSES.workout;
  }
  if (lower.includes('diet') || lower.includes('meal') || lower.includes('nutrition') || lower.includes('eat')) {
    return MOCK_RESPONSES.diet;
  }
  if (lower.includes('motivat') || lower.includes('inspire') || lower.includes('tired')) {
    return MOCK_RESPONSES.motivation;
  }
  return MOCK_RESPONSES.default;
}

// ─── Response parsing helpers ────────────────────────────────────────────────
interface GeminiPart {
  text?: string;
}
interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}
interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message?: string };
}

function extractText(data: GeminiResponse): { text: string; finishReason?: string } {
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map(p => p.text || '').join('') || '';
  return { text, finishReason: candidate?.finishReason };
}

function friendlyError(data: GeminiResponse, status: number, finishReason?: string): string {
  if (data.error?.message) return data.error.message;
  if (finishReason === 'SAFETY') return 'Response was blocked by safety filters — try rephrasing your message.';
  if (finishReason === 'MAX_TOKENS') return 'Response was cut off — try asking a more specific question.';
  if (status === 400) return 'Invalid request — your Gemini API key may be malformed.';
  if (status === 403) return 'Gemini API key was rejected. Double-check it at aistudio.google.com.';
  if (status === 429) return 'Gemini free-tier rate limit reached — wait a minute and try again.';
  return `Gemini API error (${status})`;
}

export const geminiService = {
  getApiKey(): string {
    return localStorage.getItem(STORAGE_KEY) || '';
  },

  setApiKey(key: string): void {
    localStorage.setItem(STORAGE_KEY, key.trim());
  },

  /**
   * Send a chat message to Gemini. If no API key is set, returns a
   * curated mock response after a simulated delay.
   *
   * @param messages   Full conversation history (user + assistant turns)
   * @param userContext  Optional block of the user's real fitness data
   *                      (from aiContextService.buildUserContext), appended
   *                      to the system prompt for personalized responses.
   */
  async sendMessage(messages: ChatMessage[], userContext?: string): Promise<string> {
    const apiKey = geminiService.getApiKey();

    if (!apiKey) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700)); // simulate latency
      const lastMsg = messages[messages.length - 1]?.content || '';
      return getMockResponse(lastMsg);
    }

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const systemPrompt = userContext ? `${SYSTEM_PROMPT}\n\n${userContext}` : SYSTEM_PROMPT;

    const response = await fetch(`${API_BASE}/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
      }),
    });

    const data: GeminiResponse = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(friendlyError(data, response.status));
    }

    const { text, finishReason } = extractText(data);
    if (!text) throw new Error(friendlyError(data, response.status, finishReason));
    return text;
  },

  /**
   * Analyze an image (e.g. a food photo) with a text prompt.
   * Returns null if no API key is set — callers should show a
   * "no key configured" state in that case rather than an error.
   *
   * @param base64Image  Base64-encoded image data (no data: URI prefix)
   * @param prompt       Instruction for what to extract from the image
   * @param mimeType     Image MIME type, defaults to 'image/jpeg'
   */
  async analyzeImage(base64Image: string, prompt: string, mimeType = 'image/jpeg'): Promise<string | null> {
    const apiKey = geminiService.getApiKey();
    if (!apiKey) return null;

    const response = await fetch(`${API_BASE}/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { mimeType, data: base64Image } }, { text: prompt }],
          },
        ],
        generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
      }),
    });

    const data: GeminiResponse = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(friendlyError(data, response.status));
    }

    const { text, finishReason } = extractText(data);
    if (!text) throw new Error(friendlyError(data, response.status, finishReason));
    return text;
  },
};
