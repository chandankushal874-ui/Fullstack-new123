
export { };
const ytdl = require('@distube/ytdl-core');

const VIDEO_URL = 'https://www.youtube.com/watch?v=ZgWrFoaisdk';

async function testAudioDownload() {
    console.log(`\n--- Testing Audio Download for ${VIDEO_URL} ---`);
    try {
        const info = await ytdl.getInfo(VIDEO_URL);
        console.log(`Title: ${info.videoDetails.title}`);

        const format = ytdl.chooseFormat(info.formats, { quality: 'lowestaudio' });

        if (format) {
            console.log(`Found audio format: ${format.mimeType}`);
            console.log(`URL: ${format.url}`);

            console.log("Attempting to fetch audio snippet...");
            const response = await fetch(format.url);
            console.log(`Response Status: ${response.status}`);

            if (response.status === 200 || response.status === 206) {
                console.log("Audio fetch SUCCESS!");
                // Just read a bit to confirm
                // const buffer = await response.arrayBuffer();
                // console.log(`Downloaded ${buffer.byteLength} bytes.`);
            } else {
                console.log("Audio fetch failed.");
            }

        } else {
            console.log("No audio format found.");
        }

    } catch (e: any) {
        console.error("Audio test failed:", e.message);
    }
}

testAudioDownload();
