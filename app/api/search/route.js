import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

const parser = new Parser();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get('keywords');
  const base_url = "https://news.google.com/rss/search?q={}&hl=en";

  const articles = { positive: [], neutral: [], negative: [] };

  try {
    // Fetch and parse RSS feed
    const url = base_url.replace("{}", encodeURIComponent(keywords));
    const response = await fetch(url);
    const data = await response.text();
    const feed = await parser.parseString(data);

    if (!feed.items.length) {
      return new Response(JSON.stringify(articles), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare article data
    const articleData = feed.items.map(item => ({
      title: item.title || '',
      summary: item.contentSnippet || '',
      link: item.link || '',
      date: item.pubDate || '',
    }));

    // Batch all articles into one Gemini call
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a news sentiment analyst. Analyze the sentiment of each news article below based on its headline and summary.

For each article return:
- "index": 0-based position in the list
- "score": integer sentiment score (-3 to -1 = negative, 0 = neutral, 1 to 3 = positive)
- "label": exactly one of "positive", "neutral", or "negative"

Rules:
- Focus on the factual tone of the coverage, not the topic itself
- Headlines with words like "crisis", "killed", "collapse", "scandal" are negative
- Headlines with words like "growth", "record", "breakthrough", "wins" are positive
- Neutral headlines report facts without positive or negative framing

Return ONLY a raw JSON array. No markdown, no code blocks, no explanation.

Articles:
${articleData.map((a, i) => `${i}. Title: "${a.title}" Summary: "${a.summary}"`).join('\n')}`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps in them
    const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const sentimentResults = JSON.parse(cleaned);

    // Map results back to articles
    sentimentResults.forEach(({ index, score, label }) => {
      if (index == null || index >= articleData.length) return;
      const article = { ...articleData[index], sentimentScore: score };
      if (label === 'positive') articles.positive.push(article);
      else if (label === 'negative') articles.negative.push(article);
      else articles.neutral.push(article);
    });

    return new Response(JSON.stringify(articles), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Search route error:', error);
    return new Response(JSON.stringify({ message: 'Error fetching or analyzing news' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
