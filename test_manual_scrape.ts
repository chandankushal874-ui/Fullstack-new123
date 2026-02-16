
const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Astley

async function testManualScrape() {
    console.log(`\n--- Testing manual scrape for ${VIDEO_URL} ---`);
    try {
        const response = await fetch(VIDEO_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });
        const html = await response.text();

        // Look for captionTracks
        const captionTracksRegex = /"captionTracks":\s*(\[.*?\])/;
        const match = html.match(captionTracksRegex);

        if (match && match[1]) {
            const captionTracks = JSON.parse(match[1]);
            console.log(`Found ${captionTracks.length} caption tracks.`);

            // Find English track
            const enTrack = captionTracks.find((track: any) => track.languageCode === 'en');

            if (enTrack) {
                console.log(`Found English track: ${enTrack.baseUrl}`);

                const transcriptResponse = await fetch(enTrack.baseUrl);
                const transcriptXml = await transcriptResponse.text();
                console.log(`Transcript XML length: ${transcriptXml.length}`);
                console.log(`Preview: ${transcriptXml.substring(0, 200)}`);
            } else {
                console.log("No English track found. Available languages:", captionTracks.map((t: any) => t.languageCode));
            }

        } else {
            console.log("Could not find 'captionTracks' in HTML.");
            // console.log("HTML Preview:", html.substring(0, 1000));
        }

    } catch (e: any) {
        console.error("Manual scrape failed:", e.message);
    }
}

testManualScrape();
