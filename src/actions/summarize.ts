'use server';

import Groq from 'groq-sdk';
import { YoutubeTranscript } from 'youtube-transcript';

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

async function fetchTranscriptViaYouTubeTranscript(videoUrl: string): Promise<string> {
    const items = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: 'en' });
    if (!items || items.length === 0) throw new Error('Empty transcript returned');
    return items.map(i => i.text).join(' ');
}

async function fetchTranscriptViaScraping(videoUrl: string): Promise<string> {
    const response = await fetch(videoUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} fetching video page`);
    const html = await response.text();

    // Try to find caption tracks in the page source
    const captionTracksMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionTracksMatch) throw new Error('No caption tracks found in page source');

    const captionTracks = JSON.parse(captionTracksMatch[1]);
    // Prefer English, then any available track
    const track = captionTracks.find((t: any) => t.languageCode === 'en') ||
        captionTracks.find((t: any) => t.languageCode?.startsWith('en')) ||
        captionTracks[0];

    if (!track?.baseUrl) throw new Error('No usable caption track found');

    const transcriptResponse = await fetch(track.baseUrl);
    const xml = await transcriptResponse.text();

    const texts: string[] = [];
    const regex = /<text[^>]*>(.*?)<\/text>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) {
        texts.push(
            m[1]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/<[^>]+>/g, '')
        );
    }

    if (texts.length === 0) throw new Error('Parsed empty transcript from XML');
    return texts.join(' ');
}

async function fetchTranscriptViaYouTubeDataAPI(videoId: string): Promise<string> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('YOUTUBE_API_KEY not set');

    // Get caption list
    const listRes = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
    );
    const listData = await listRes.json();
    if (!listData.items?.length) throw new Error('No captions found via YouTube Data API');

    const enCaption = listData.items.find((c: any) => c.snippet.language === 'en') || listData.items[0];
    const captionId = enCaption.id;

    // Download caption track (requires OAuth for non-ASR tracks, but ASR/auto-generated work with API key)
    const downloadRes = await fetch(
        `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt&key=${apiKey}`
    );
    if (!downloadRes.ok) throw new Error(`Caption download failed: ${downloadRes.status}`);
    const srt = await downloadRes.text();

    // Strip SRT formatting
    const text = srt
        .replace(/\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\n\n/g, ' ')
        .trim();

    return text;
}

async function generateSummaryWithGroq(transcript: string): Promise<{ summary: string; studyNotes: string }> {
    const groq = getGroqClient();
    const truncated = transcript.length > 40000 ? transcript.substring(0, 40000) + '...' : transcript;

    const completion = await groq.chat.completions.create({
        messages: [{
            role: 'user',
            content: `You are an expert AI study assistant. Here is the transcript of a YouTube video:

"${truncated}"

Please provide TWO things:
1. A concise Summary of the video (2-3 paragraphs).
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
                return { summary: '', studyNotes: '', error: 'Invalid YouTube URL. Please use a standard youtube.com/watch?v= or youtu.be/ link.' };
            }

            const errors: string[] = [];

            // Method 1: youtube-transcript library (fastest)
            try {
                console.log('Trying youtube-transcript...');
                fullTranscript = await fetchTranscriptViaYouTubeTranscript(videoUrl);
                console.log('✅ youtube-transcript succeeded.');
            } catch (e: any) {
                errors.push(`youtube-transcript: ${e.message}`);
                console.warn('youtube-transcript failed:', e.message);
            }

            // Method 2: Manual HTML scraping
            if (!fullTranscript) {
                try {
                    console.log('Trying manual scraping...');
                    fullTranscript = await fetchTranscriptViaScraping(videoUrl);
                    console.log('✅ Manual scraping succeeded.');
                } catch (e: any) {
                    errors.push(`scraping: ${e.message}`);
                    console.warn('Manual scraping failed:', e.message);
                }
            }

            // Method 3: YouTube Data API v3 (if key is available)
            if (!fullTranscript && process.env.YOUTUBE_API_KEY) {
                try {
                    console.log('Trying YouTube Data API...');
                    fullTranscript = await fetchTranscriptViaYouTubeDataAPI(videoId);
                    console.log('✅ YouTube Data API succeeded.');
                } catch (e: any) {
                    errors.push(`YouTube Data API: ${e.message}`);
                    console.warn('YouTube Data API failed:', e.message);
                }
            }

            if (!fullTranscript) {
                return {
                    summary: '',
                    studyNotes: '',
                    error: `Transcript failed: Could not retrieve captions automatically. This video may have captions disabled or be restricted.\n\nDetails: ${errors.join('; ')}\n\nTip: Click "Having trouble?" above to paste the transcript manually.`,
                };
            }
        }

        // Generate summary with Groq
        const { summary, studyNotes } = await generateSummaryWithGroq(fullTranscript);
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
