// // app/api/search/route.js
// import Parser from 'rss-parser';
// import Sentiment from 'sentiment';

// const parser = new Parser();
// const sentiment = new Sentiment();

// export async function GET(request) {
//   const { searchParams } = new URL(request.url);
//   const keywords = searchParams.get('keywords');
//   const base_url = "https://news.google.com/rss/search?q={}&hl=en-NG&gl=NG&ceid=NG:en";
//   const negative_articles = [];

//   try {
//     // Format the URL with keywords
//     const url = base_url.replace("{}", encodeURIComponent(keywords));
//     const response = await fetch(url);
//     const data = await response.text();

//     // Parse RSS feed using rss-parser
//     const feed = await parser.parseString(data);
//     feed.items.forEach(item => {
//       // Combine the title and summary (or content snippet) for sentiment analysis
//       const combinedText = `${item.title} ${item.contentSnippet}`;
//       const result = sentiment.analyze(combinedText);
//       // result.score is a numerical score; negative values indicate negative sentiment
//       if (result.score < 0) {
//         negative_articles.push({
//           title: item.title,
//           summary: item.contentSnippet,
//           link: item.link,
//           date: item.pubDate,
//           sentimentScore: result.score,
//         });
//       }
//     });

//     return new Response(JSON.stringify({ articles: negative_articles }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error(error);
//     return new Response(JSON.stringify({ message: 'Error fetching news' }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }





// app/api/search/route.js
import Parser from 'rss-parser';
import Sentiment from 'sentiment';

const parser = new Parser();
const sentiment = new Sentiment();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get('keywords');
  const base_url = "https://news.google.com/rss/search?q={}&hl=en";
  
  const articles = {
    positive: [],
    neutral: [],
    negative: []
  };

  try {
    // Format the URL with keywords
    const url = base_url.replace("{}", encodeURIComponent(keywords));
    const response = await fetch(url);
    const data = await response.text();

    // Parse RSS feed
    const feed = await parser.parseString(data);
    
    feed.items.forEach(item => {
      // Combine title and snippet for sentiment analysis
      const combinedText = `${item.title} ${item.contentSnippet}`;
      const result = sentiment.analyze(combinedText);
      
      // Categorize based on sentiment score
      const article = {
        title: item.title,
        summary: item.contentSnippet,
        link: item.link,
        date: item.pubDate,
        sentimentScore: result.score
      };

      if (result.score > 0) {
        articles.positive.push(article);
      } else if (result.score < 0) {
        articles.negative.push(article);
      } else {
        articles.neutral.push(article);
      }
    });

    return new Response(JSON.stringify(articles), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ message: 'Error fetching news' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
