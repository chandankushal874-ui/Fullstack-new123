
const ytdl = require('@distube/ytdl-core');

const VIDEO_URL = 'https://www.youtube.com/watch?v=ZgWrFoaisdk';

async function testYtdl() {
    console.log(`\n--- Testing @distube/ytdl-core for ${VIDEO_URL} ---`);
    try {
        const info = await ytdl.getInfo(VIDEO_URL);
        console.log(`Title: ${info.videoDetails.title}`);

        const tracks = info.player_response.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (tracks && tracks.length > 0) {
            console.log(`Found ${tracks.length} caption tracks.`);
            console.log("Available tracks:", tracks.map((t: any) => `${t.languageCode}`).join(', '));

            const enTrack = tracks.find((t: any) => t.languageCode === 'en');

            if (enTrack) {
                console.log(`Fetching English track from: ${enTrack.baseUrl}`);
                // Try fetching this URL - ytdl might have deciphered it or provided a clean one
                const response = await fetch(enTrack.baseUrl);
                const text = await response.text();
                console.log(`Response Length: ${text.length}`);
                if (text.length > 0) {
                    console.log(text.substring(0, 200));
                } else {
                    console.log("Response is empty.");
                }
            }
        } else {
            console.log("No caption tracks found in ytdl info.");
        }

    } catch (e: any) {
        console.error("ytdl failed:", e.message);
    }
}

testYtdl();
