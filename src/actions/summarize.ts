'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Innertube, UniversalCache } from 'youtubei.js';
import { YoutubeTranscript } from 'youtube-transcript';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface SummaryResult {
    summary: string;
    studyNotes: string;
    error?: string;
}

export async function summarizeVideo(videoUrl: string, manualTranscript?: string): Promise<SummaryResult> {
    if (!process.env.GEMINI_API_KEY) {
        return {
            summary: '',
            studyNotes: '',
            error: 'Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file.',
        };
    }

    try {
        let fullTranscript = '';

        if (manualTranscript && manualTranscript.trim().length > 0) {
            console.log("Using manual transcript provided by user.");
            fullTranscript = manualTranscript;
        } else {
            // 1. Extract Video ID
            const videoIdMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w-]{11})/);
            const videoId = videoIdMatch ? videoIdMatch[1] : null;

            if (!videoId) {
                return { summary: '', studyNotes: '', error: 'Invalid YouTube URL' };
            }

            // 2. Fetch Transcript using youtubei.js (Innertube)
            try {
                // Try multiple clients if one fails
                const clients = ['WEB', 'ANDROID', 'TV', 'WEB_CREATOR'];
                let transcriptData;
                const errors = [];

                for (const clientType of clients) {
                    try {
                        const innertube = await Innertube.create({
                            cache: new UniversalCache(false),
                            generate_session_locally: true,
                            lang: 'en',
                            location: 'US'
                        });

                        // @ts-ignore - client type might not trigger correct overload in all versions
                        const info = await innertube.getInfo(videoId, { client: clientType });

                        try {
                            transcriptData = await info.getTranscript();
                        } catch (transcriptError) {
                            // Some clients return info but fail on getTranscript
                            console.error(`Client ${clientType} getTranscript failed:`, transcriptError);
                            throw transcriptError;
                        }

                        if (transcriptData && transcriptData.transcript) {
                            break;
                        }
                    } catch (e) {
                        console.error(`Attempt with client ${clientType} failed:`, e);
                        errors.push(`${clientType}: ${(e as Error).message}`);
                        continue;
                    }
                }

                if (transcriptData && transcriptData.transcript) {
                    // Extract text segments from youtubei.js
                    const segments = transcriptData.transcript.content?.body?.initial_segments || [];
                    if (segments.length > 0) {
                        fullTranscript = segments.map((seg: any) => seg.snippet.text).join(' ');
                    }
                }

                // Fallback to youtube-transcript if youtubei.js failed
                if (!fullTranscript) {
                    console.log("youtubei.js failed or returned empty. Trying youtube-transcript fallback...");
                    try {
                        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoUrl);
                        if (transcriptItems && transcriptItems.length > 0) {
                            fullTranscript = transcriptItems.map(item => item.text).join(' ');
                            console.log("Fallback to youtube-transcript successful.");
                        } else {
                            console.error("Fallback youtube-transcript returned empty items.");
                            errors.push("Fallback 1 (youtube-transcript): Returned empty transcript.");
                        }
                    } catch (fallbackError: any) {
                        console.error("Fallback youtube-transcript failed:", fallbackError);
                        errors.push(`Fallback 1 (youtube-transcript): ${fallbackError.message}`);
                    }
                }

                // Fallback 2: Manual Scraping (Ultimate Fallback)
                if (!fullTranscript) {
                    console.log("youtube-transcript failed. Trying manual scraping fallback...");
                    try {
                        const response = await fetch(videoUrl, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                                'Accept-Language': 'en-US,en;q=0.9',
                            }
                        });
                        const html = await response.text();
                        const captionTracksRegex = /"captionTracks":\s*(\[.*?\])/;
                        const match = html.match(captionTracksRegex);

                        if (match && match[1]) {
                            const captionTracks = JSON.parse(match[1]);
                            const enTrack = captionTracks.find((track: any) => track.languageCode === 'en');

                            if (enTrack) {
                                console.log("Found English track via manual scraping:", enTrack.baseUrl);
                                const transcriptResponse = await fetch(enTrack.baseUrl);
                                const transcriptXml = await transcriptResponse.text();

                                // Simple XML parsing to extract text
                                const textMatches = transcriptXml.matchAll(/<text[^>]*>(.*?)<\/text>/g);
                                const texts = [];
                                for (const match of textMatches) {
                                    texts.push(match[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
                                }

                                if (texts.length > 0) {
                                    fullTranscript = texts.join(' ');
                                    console.log("Fallback to manual scraping successful.");
                                } else {
                                    console.error("Manual scraping found track but extracted empty text.");
                                    errors.push("Fallback 2 (manual): Found track but extracted empty text.");
                                }
                            } else {
                                console.error("Manual scraping found captionTracks but no English track.");
                                errors.push(`Fallback 2 (manual): No English track found. Available: ${captionTracks.map((t: any) => t.languageCode).join(', ')}`);
                            }
                        } else {
                            console.error("Manual scraping failed to find captionTracks in HTML.");
                            errors.push("Fallback 2 (manual): Could not find captionTracks in HTML. Video might be age-restricted or Require Login.");
                        }
                    } catch (manualError: any) {
                        console.error("Manual scraping fallback failed:", manualError);
                        errors.push(`Fallback 2 (manual): ${manualError.message}`);
                    }
                }

                if (!fullTranscript) {
                    throw new Error(`No transcript available after trying multiple clients and fallback. Details: ${errors.join('; ')}`);
                }

            } catch (error: any) {
                console.error("Transcript Fetch Error:", error);
                return { summary: '', studyNotes: '', error: `Transcript failed: ${error?.message || error}` };
            }
        }

        if (!fullTranscript) {
            return { summary: '', studyNotes: '', error: 'No transcript text found.' };
        }

        // 3. Generate Summary with Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Truncate if too long
        const truncatedTranscript = fullTranscript.length > 50000 ? fullTranscript.substring(0, 50000) + "..." : fullTranscript;

        const prompt = `
      You are an expert AI study assistant.
      Here is the transcript of a YouTube video:
      "${truncatedTranscript}"

      Please provide TWO things:
      1. A concise **Summary** of the video (2-3 paragraphs).
      2. Detailed **Study Notes** in Markdown format. Use bullet points, bold text for key terms, and headers.
      
      Return your response in JSON format like this:
      {
        "summary": "The summary text...",
        "studyNotes": "# Study Notes\n\n- Point 1..."
      }
    `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // 4. Parse JSON response
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const data = JSON.parse(cleanedText);
            return {
                summary: data.summary,
                studyNotes: data.studyNotes
            };
        } catch (e) {
            console.error("JSON Parse Error:", e);
            return {
                summary: "Error parsing AI response.",
                studyNotes: text,
                error: undefined
            };
        }

    } catch (error: any) {
        console.error('Summarization Error:', error);

        // Handle Rate Limits (429)
        if (error.status === 429 || error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
            return {
                summary: '',
                studyNotes: '',
                error: 'Gemini API usage limit reached. Please wait a minute and try again.',
            };
        }

        // Handle Overloaded (503)
        if (error.status === 503 || error.message?.includes('503')) {
            return {
                summary: '',
                studyNotes: '',
                error: 'Gemini API is temporarily overloaded. Please try again later.',
            };
        }

        return {
            summary: '',
            studyNotes: '',
            error: `An error occurred: ${error?.message || String(error)}`,
        };
    }
}
