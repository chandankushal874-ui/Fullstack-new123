'use server';

import Groq from 'groq-sdk';

// Lazily instantiated to avoid build-time errors when env vars are not yet available
function getGroqClient() {
    return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

interface SummaryResult {
    summary: string;
    studyNotes: string;
    error?: string;
}

function extractVideoId(url: string): string | null {
    // Handle all YouTube URL formats including mobile, shorts, embed, and bare IDs
    const patterns = [
        /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([\w-]{11})/,
        /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([\w-]{11})/,
        /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([\w-]{11})/,
        /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([\w-]{11})/,
        /^([\w-]{11})$/, // bare video ID
    ];
    for (const pattern of patterns) {
        const match = url.trim().match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Uses Supadata.ai API - a dedicated transcript service that bypasses YouTube's
 * IP blocking of datacenter servers (like Vercel). Free tier: 100 req/month.
 * Sign up at https://supadata.ai to get an API key.
 */
async function fetchTranscriptViaSupadata(videoId: string): Promise<string> {
    const apiKey = process.env.SUPADATA_API_KEY;
    if (!apiKey) throw new Error('SUPADATA_API_KEY not set');

    const res = await fetch(
        `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`,
        {
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
            },
        }
    );

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Supadata API error ${res.status}: ${body.substring(0, 200)}`);
    }

    const data = await res.json();
    // Supadata returns { content: string } when text=true
    const text = data.content || data.text || '';
    if (!text || text.trim().length === 0) throw new Error('Supadata returned empty transcript');
    return text;
}

/**
 * Fallback: youtube-transcript npm package
 */
async function fetchTranscriptViaLibrary(videoUrl: string): Promise<string> {
    const { YoutubeTranscript } = await import('youtube-transcript');
    const items = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: 'en' });
    if (!items || items.length === 0) throw new Error('Empty transcript returned');
    return items.map((i: any) => i.text).join(' ');
}

/**
 * Fallback: YouTube's internal timedtext JSON3 API
 */
async function fetchTranscriptViaTimedText(videoId: string): Promise<string> {
    const langs = ['en', 'en-US', 'a.en'];
    for (const lang of langs) {
        try {
            const url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3`;
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                }
            });
            if (!res.ok) continue;
            const data = await res.json();
            if (!data.events?.length) continue;

            const texts = data.events
                .filter((e: any) => e.segs)
                .flatMap((e: any) => e.segs.map((s: any) => s.utf8 || ''))
                .filter((t: string) => t.trim() && t !== '\n');

            if (texts.length > 0) return texts.join(' ');
        } catch {
            continue;
        }
    }
    throw new Error('timedtext API returned no results');
}

async function generateSummaryWithGroq(transcript: string, videoUrl?: string): Promise<{ summary: string; studyNotes: string }> {
    const groq = getGroqClient();
    const truncated = transcript.length > 40000 ? transcript.substring(0, 40000) + '...' : transcript;
    const videoContext = videoUrl ? `\nVideo URL: ${videoUrl}\nNote: Use the URL and transcript to identify the video title, artist, or topic if possible.` : '';

    const completion = await groq.chat.completions.create({
        messages: [{
            role: 'user',
            content: `You are an expert AI study assistant. Here is the transcript of a YouTube video:${videoContext}

"${truncated}"

Please provide TWO things:
1. A concise Summary of the video (2-3 paragraphs). Start by identifying what the video is (e.g. song name, artist, topic, channel) if you can determine it.
2. Detailed Study Notes in Markdown format. Use bullet points, bold text for key terms, and headers.

Return your response in JSON format like this:
{
  "summary": "The summary text...",
  "studyNotes": "# Study Notes\\n\\n- Point 1..."
}`
        }],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content || '{}';
    const data = JSON.parse(text);
    return {
        summary: data.summary || 'No summary generated.',
        studyNotes: data.studyNotes || 'No study notes generated.',
    };
}

export async function summarizeVideo(videoUrl: string, manualTranscript?: string): Promise<SummaryResult> {
    if (!process.env.GROQ_API_KEY) {
        return { summary: '', studyNotes: '', error: 'GROQ_API_KEY is missing.' };
    }

    try {
        let fullTranscript = '';

        // Use manual transcript if provided
        if (manualTranscript?.trim()) {
            console.log('Using manual transcript.');
            fullTranscript = manualTranscript.trim();
        } else {
            const videoId = extractVideoId(videoUrl);
            if (!videoId) {
                return {
                    summary: '',
                    studyNotes: '',
                    error: 'Invalid YouTube URL. Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...'
                };
            }

            const errors: string[] = [];

            // Method 1: Supadata API (most reliable - bypasses YouTube IP blocks)
            if (process.env.SUPADATA_API_KEY) {
                try {
                    console.log('Trying Supadata API...');
                    fullTranscript = await fetchTranscriptViaSupadata(videoId);
                    console.log('✅ Supadata succeeded.');
                } catch (e: any) {
                    errors.push(`Supadata: ${e.message}`);
                    console.warn('Supadata failed:', e.message);
                }
            }

            // Method 2: youtube-transcript library
            if (!fullTranscript) {
                try {
                    console.log('Trying youtube-transcript library...');
                    fullTranscript = await fetchTranscriptViaLibrary(videoUrl);
                    console.log('✅ youtube-transcript succeeded.');
                } catch (e: any) {
                    errors.push(`youtube-transcript: ${e.message}`);
                    console.warn('youtube-transcript failed:', e.message);
                }
            }

            // Method 3: YouTube timedtext API
            if (!fullTranscript) {
                try {
                    console.log('Trying timedtext API...');
                    fullTranscript = await fetchTranscriptViaTimedText(videoId);
                    console.log('✅ Timedtext API succeeded.');
                } catch (e: any) {
                    errors.push(`timedtext: ${e.message}`);
                    console.warn('Timedtext API failed:', e.message);
                }
            }

            if (!fullTranscript) {
                return {
                    summary: '',
                    studyNotes: '',
                    error: `Could not retrieve captions for this video. This usually happens because:\n• The video has captions disabled\n• YouTube is blocking automated access\n\nDetails: ${errors.join('; ')}\n\nTip: Click "Having trouble?" above to paste the transcript manually (YouTube → video → "..." → Show transcript → copy all).`,
                };
            }
        }

        // Generate summary with Groq
        const { summary, studyNotes } = await generateSummaryWithGroq(fullTranscript, videoUrl);
        return { summary, studyNotes };

    } catch (error: any) {
        console.error('Summarization Error:', error);
        return {
            summary: '',
            studyNotes: '',
            error: `An error occurred: ${error?.message || String(error)}`,
        };
    }
}
