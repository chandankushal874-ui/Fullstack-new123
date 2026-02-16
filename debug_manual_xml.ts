export { };
import fs from 'fs';

const VIDEO_URL = 'https://www.youtube.com/watch?v=ZgWrFoaisdk';

async function debugManualXml() {
    console.log(`\n--- Debugging Manual XML with Cookies for ${VIDEO_URL} ---`);
    try {
        const response = await fetch(VIDEO_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        // Capture cookies
        const cookies = response.headers.get('set-cookie');
        console.log(`Initial Cookies: ${cookies ? 'YES' : 'NO'}`);
        if (cookies) console.log(`Cookie header: ${cookies}`);

        const html = await response.text();
        const captionTracksRegex = /"captionTracks":\s*(\[.*?\])/;
        const match = html.match(captionTracksRegex);

        if (match && match[1]) {
            const captionTracks = JSON.parse(match[1]);
            const enTrack = captionTracks.find((track: any) => track.languageCode === 'en');

            if (enTrack) {
                console.log(`\nOriginal Base URL: ${enTrack.baseUrl}`);

                // Fetch with cookies
                console.log(`\n--- Fetching with Cookies ---`);
                const xmlResponse = await fetch(enTrack.baseUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cookie': cookies || ''
                    }
                });
                console.log(`Response Status: ${xmlResponse.status}`);
                const xmlText = await xmlResponse.text();
                console.log(`XML Length: ${xmlText.length}`);
                if (xmlText.length > 0) {
                    console.log(xmlText.substring(0, 200));
                } else {
                    console.log("Response is empty.");
                }

            } else {
                console.log("No English track found.");
            }
        } else {
            console.log("No captionTracks found in HTML.");
        }

    } catch (e: any) {
        console.error("Debug failed:", e.message);
    }
}

debugManualXml();
