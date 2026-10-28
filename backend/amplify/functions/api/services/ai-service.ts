import { runtime } from '../config/runtime';

const safetyTerms = ['pain', 'chest', 'symptom', 'fever', 'diagnose', 'medicine', 'dosage', 'prescribe'];

export async function coach(name: string, message: string) {
  if (safetyTerms.some((term) => message.toLowerCase().includes(term))) {
    const text = `${name}, I am a lifestyle habit coach, not a medical professional. I cannot evaluate symptoms or prescribe medication. Please consult a licensed physician or emergency provider.`;
    return { text, reply: text };
  }
  if (!runtime.SARVAM_API_KEY) throw new Error('AI_NOT_CONFIGURED');
  const providerResponse = await fetch('https://api.sarvam.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${runtime.SARVAM_API_KEY}` },
    body: JSON.stringify({
      model: runtime.SARVAM_MODEL,
      temperature: 0.6,
      max_tokens: 200,
      messages: [
        { role: 'system', content: `You are CareVity, a lifestyle habit coach for ${name}. Never diagnose, prescribe, or recommend medication.` },
        { role: 'user', content: message },
      ],
    }),
  });
  if (!providerResponse.ok) throw new Error('AI_PROVIDER_ERROR');
  const payload = await providerResponse.json() as { choices?: { message?: { content?: string } }[] };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('AI_EMPTY_RESPONSE');
  return { text, reply: text };
}
