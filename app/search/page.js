'use client';

import { useState } from 'react';

export default function NewsSearch() {
  const [keywords, setKeywords] = useState('');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?keywords=${encodeURIComponent(keywords)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      const data = await response.json();
      setArticles(data.articles);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center">Negative News Search</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-lg flex flex-col gap-4">
        <input
          type="text"
          placeholder="Enter search keywords..."
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all duration-300"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* {loading && <p className="mt-4 text-gray-600 dark:text-gray-400">Loading news...</p>} */}
      {error && <p className="mt-4 text-red-500">{error}</p>}

      {articles.length > 0 && (
        <ul className="mt-8 w-full max-w-2xl space-y-6">
          {articles.map((article, index) => (
            <li key={index} className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {article.title}
                </a>
              </h3>
              <p className="text-gray-700 dark:text-gray-300">{article.summary}</p>
              <p className="text-sm text-gray-500 mt-2">{article.date}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
