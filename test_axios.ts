export { };
import axios from 'axios';
const VIDEO_URL = 'https://www.youtube.com/watch?v=ZgWrFoaisdk';

async function testAxios() {
    console.log(`\n--- Testing Axios for ${VIDEO_URL} ---`);
    try {
        const response = await axios.get(VIDEO_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        const html = response.data;
        const captionTracksRegex = /"captionTracks":\s*(\[.*?\])/;
        const match = html.match(captionTracksRegex);

        if (match && match[1]) {
            const captionTracks = JSON.parse(match[1]);
            const enTrack = captionTracks.find((track: any) => track.languageCode === 'en');

            if (enTrack) {
                console.log(`\nOriginal Base URL: ${enTrack.baseUrl}`);

                // Fetch with Axios
                console.log(`\n--- Fetching with Axios ---`);
                const xmlResponse = await axios.get(enTrack.baseUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    }
                });

                const xmlText = xmlResponse.data;
                console.log(`Response Length: ${xmlText.length}`);
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
        console.error("Axios failed:", e.message);
    }
}

testAxios();
