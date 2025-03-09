'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function NewsSearch() {
  const [keywords, setKeywords] = useState('');
  const [articles, setArticles] = useState({ positive: [], neutral: [], negative: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchTerms, setSearchTerms] = useState([]);
  
  // Date filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!keywords.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/search?keywords=${encodeURIComponent(keywords)}`);
      if (!response.ok) throw new Error('Failed to fetch news');
      const data = await response.json();
      setArticles(data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      setSearchTerms(parsedData.flat().filter((term) => term));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBatchSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const allResults = { positive: [], neutral: [], negative: [] };
      for (const term of searchTerms) {
        const response = await fetch(`/api/search?keywords=${encodeURIComponent(term)}`);
        if (!response.ok) throw new Error('Failed to fetch news');
        const data = await response.json();
        Object.keys(data).forEach((key) => {
          allResults[key].push(...data[key].map((article) => ({ ...article, searchItem: term })));
        });
      }
      setArticles(allResults);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort articles based on the current filter and date range
  const filteredArticles = Object.entries(articles)
    .filter(([key]) => filter === 'all' || key === filter)
    .flatMap(([_, list]) =>
      list.filter((article) => {
        const articleDate = new Date(article.date);
        const fromDateValid = fromDate ? articleDate >= new Date(fromDate) : true;
        const toDateValid = toDate ? articleDate <= new Date(toDate) : true;
        return fromDateValid && toDateValid;
      })
    )
    .sort((a, b) =>
      sortOrder === 'newest'
        ? new Date(b.date) - new Date(a.date)
        : new Date(a.date) - new Date(b.date)
    );

  const handleDownload = () => {
    // Map the filtered articles into rows matching the UI display
    const rows = filteredArticles.map(article => {
      const classification =
        article.sentimentScore > 0
          ? 'Positive'
          : article.sentimentScore < 0
          ? 'Negative'
          : 'Neutral';
      return [
        article.searchItem || keywords,
        article.title,
        article.link,
        classification,
        new Date(article.date).toLocaleString()
      ];
    });
    const header = ['Search Item', 'Headline', 'Link', 'Classification', 'Date'];
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, 'news_results.xlsx');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-center">Online Media Watch</h1>
      
      {/* Manual Search */}
      <form onSubmit={handleManualSearch} className="w-full max-w-lg flex flex-col gap-4 mb-6">
        <input
          type="text"
          placeholder="Enter search keywords..."
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="w-full p-3 rounded-lg border bg-white dark:bg-gray-800"
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      
      {/* File Upload & Batch Search */}
      <div className="w-full max-w-lg flex flex-col gap-4 mb-6">
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="p-2 border rounded" />
        <button onClick={handleBatchSearch} className="w-full bg-blue-600 text-white py-3 rounded-lg" disabled={!searchTerms.length}>
          {loading ? 'Searching...' : 'Search from File'}
        </button>
      </div>
      
      {error && <p className="text-red-500">{error}</p>}
      
      {/* Date Filter */}
      <div className="flex justify-between w-full max-w-lg mt-6 gap-4">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="p-2 rounded border"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="p-2 rounded border"
        />
      </div>
      
      {/* Filters */}
      <div className="flex justify-between w-full max-w-lg mt-6">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="p-2 rounded border">
          <option value="all">All</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="p-2 rounded border">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>
      
      {/* Articles */}
      {filteredArticles.length > 0 && (
        <ul className="mt-10 w-full max-w-3xl space-y-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filteredArticles.map((article, index) => (
            <li key={index} className="p-5 bg-white rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">
                <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {article.title}
                </a>
              </h3>
              <p>{article.summary}</p>
              <p className="text-sm text-gray-500 mt-2">{new Date(article.date).toLocaleString()}</p>
              <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                article.sentimentScore > 0 ? 'bg-green-200 text-green-800' : article.sentimentScore < 0 ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
              }`}>
                {article.sentimentScore > 0 ? 'Positive' : article.sentimentScore < 0 ? 'Negative' : 'Neutral'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button onClick={handleDownload} className="mt-6 bg-green-600 text-white py-2 px-4 rounded" disabled={!filteredArticles.length}>
        Download Results
      </button>
    </div>
  );
}
























