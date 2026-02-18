
import axios from 'axios';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1";

export async function searchWeb(query: string) {
    if (!FIRECRAWL_API_KEY) {
        console.warn("FIRECRAWL_API_KEY is not set. Deep search will be disabled.");
        return null;
    }

    try {
        const response = await axios.post(
            `${FIRECRAWL_API_URL}/search`,
            {
                query: query,
                limit: 3,
            },
            {
                headers: {
                    Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data;
    } catch (error: any) {
        console.error("Firecrawl API Error:", error.response?.data || error.message);
        return null;
    }
}
