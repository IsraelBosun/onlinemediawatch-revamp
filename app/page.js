'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Input, Card, Tab, Button, getSentimentColor } from './components/DateFilter';
import { Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Main component
export default function NewsSearch() {
  // Tab state
  const [activeTab, setActiveTab] = useState('manual');

  // Search states
  const [keywords, setKeywords] = useState('');
  const [articles, setArticles] = useState({ positive: [], neutral: [], negative: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerms, setSearchTerms] = useState([]);

  // Filter states
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [preSearchFilter, setPreSearchFilter] = useState('all');

  // Analytics states
  const [selectedSentiments, setSelectedSentiments] = useState({
    positive: true,
    neutral: true,
    negative: true
  });

  const performSearch = async (terms, isFromFile = false) => {
    setLoading(true);
    setError(null);
    try {
      if (isFromFile) {
        const allResults = { positive: [], neutral: [], negative: [] };
        for (const term of terms) {
          const filterParam = preSearchFilter !== 'all' ? `&filter=${preSearchFilter}` : '';
          const dateParams = `${fromDate ? `&fromDate=${fromDate}` : ''}${toDate ? `&toDate=${toDate}` : ''}`;

          const response = await fetch(`/api/search?keywords=${encodeURIComponent(term)}${filterParam}${dateParams}`);
          if (!response.ok) throw new Error('Failed to fetch news');
          const data = await response.json();
          Object.keys(data).forEach((key) => {
            allResults[key].push(...data[key].map((article) => ({ ...article, searchItem: term })));
          });
        }
        setArticles(allResults);
      } else {
        const filterParam = preSearchFilter !== 'all' ? `&filter=${preSearchFilter}` : '';
        const dateParams = `${fromDate ? `&fromDate=${fromDate}` : ''}${toDate ? `&toDate=${toDate}` : ''}`;

        const response = await fetch(`/api/search?keywords=${encodeURIComponent(terms)}${filterParam}${dateParams}`);
        if (!response.ok) throw new Error('Failed to fetch news');
        const data = await response.json();
        setArticles(data);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!keywords.trim()) return;
    await performSearch(keywords);
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
    if (!searchTerms.length) return;
    await performSearch(searchTerms, true);
  };

  // Filter articles based on current filter and date range
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

  // Prepare data for sentiment pie chart
  // Prepare data for sentiment pie chart
  const preparePieChartData = () => {
    // Create a filtered version of the articles that respects date filters
    const filteredArticlesByType = {
      positive: articles.positive.filter(article => {
        const articleDate = new Date(article.date);
        const fromDateValid = fromDate ? articleDate >= new Date(fromDate) : true;
        const toDateValid = toDate ? articleDate <= new Date(toDate) : true;
        return fromDateValid && toDateValid;
      }),
      neutral: articles.neutral.filter(article => {
        const articleDate = new Date(article.date);
        const fromDateValid = fromDate ? articleDate >= new Date(fromDate) : true;
        const toDateValid = toDate ? articleDate <= new Date(toDate) : true;
        return fromDateValid && toDateValid;
      }),
      negative: articles.negative.filter(article => {
        const articleDate = new Date(article.date);
        const fromDateValid = fromDate ? articleDate >= new Date(fromDate) : true;
        const toDateValid = toDate ? articleDate <= new Date(toDate) : true;
        return fromDateValid && toDateValid;
      })
    };

    const counts = {
      Positive: filteredArticlesByType.positive.length,
      Neutral: filteredArticlesByType.neutral.length,
      Negative: filteredArticlesByType.negative.length
    };

    console.log(counts.Positive, 'this is positive')

    return {
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [
        {
          data: [counts.Positive, counts.Neutral, counts.Negative],
          backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(255, 99, 132, 0.8)'],
          borderColor: ['rgb(54, 162, 235)', 'rgb(255, 206, 86)', 'rgb(255, 99, 132)'],
          borderWidth: 1,
        },
      ],
    };
  };

  // Prepare data for sentiment time series
  const prepareLineChartData = () => {
    const dateMap = new Map();

    // Filter articles by date for each sentiment type
    const filteredArticlesByType = {
      positive: articles.positive.filter(article => {
        const articleDate = new Date(article.date);
        const fromDateValid = fromDate ? articleDate >= new Date(fromDate) : true;
        const toDateValid = toDate ? articleDate <= new Date(toDate) : true;
        return fromDateValid && toDateValid;
      }),
      neutral: articles.neutral.filter(article => {
        const articleDate = new Date(article.date);
        const fromDateValid = fromDate ? articleDate >= new Date(fromDate) : true;
        const toDateValid = toDate ? articleDate <= new Date(toDate) : true;
        return fromDateValid && toDateValid;
      }),
      negative: articles.negative.filter(article => {
        const articleDate = new Date(article.date);
        const fromDateValid = fromDate ? articleDate >= new Date(fromDate) : true;
        const toDateValid = toDate ? articleDate <= new Date(toDate) : true;
        return fromDateValid && toDateValid;
      })
    };

    // Process all filtered articles to get counts by date
    Object.entries(filteredArticlesByType).forEach(([sentiment, articles]) => {
      if (selectedSentiments[sentiment]) {
        articles.forEach(article => {
          const date = new Date(article.date).toISOString().split('T')[0];
          if (!dateMap.has(date)) {
            dateMap.set(date, { positive: 0, neutral: 0, negative: 0 });
          }
          dateMap.get(date)[sentiment]++;
        });
      }
    });

    // Sort dates
    const sortedDates = Array.from(dateMap.keys()).sort();

    // Create datasets
    const datasets = [];

    if (selectedSentiments.positive) {
      datasets.push({
        label: 'Positive',
        data: sortedDates.map(date => dateMap.get(date).positive),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.1
      });
    }

    if (selectedSentiments.neutral) {
      datasets.push({
        label: 'Neutral',
        data: sortedDates.map(date => dateMap.get(date).neutral),
        borderColor: 'rgb(255, 206, 86)',
        backgroundColor: 'rgba(255, 206, 86, 0.5)',
        tension: 0.1
      });
    }

    if (selectedSentiments.negative) {
      datasets.push({
        label: 'Negative',
        data: sortedDates.map(date => dateMap.get(date).negative),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.1
      });
    }

    return {
      labels: sortedDates,
      datasets
    };
  };

  // lineChartOptions

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Sentiment Trends Over Time'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Article Count'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
  };


  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Sentiment Distribution'
      }
    }
  };

  const toggleSentiment = (sentiment) => {
    setSelectedSentiments(prev => ({
      ...prev,
      [sentiment]: !prev[sentiment]
    }));
  };

  const FiltersPanel = () => (
    <div className="mb-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">Filters</h3>
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs mb-1">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const ResultsSection = () => (
    <div className="mt-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Results <span className="text-gray-500 text-sm">({filteredArticles.length} articles)</span>
          </h2>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="p-2 text-sm rounded-lg border border-gray-300 bg-white dark:bg-gray-800"
            >
              <option value="all">All Results</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="p-2 text-sm rounded-lg border border-gray-300 bg-white dark:bg-gray-800"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {filteredArticles.length > 0 ? (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArticles.map((article, index) => (
                <Card key={index} className="h-full">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getSentimentColor(article.sentimentScore)}`}>
                      {article.sentimentScore > 0 ? 'Positive' : article.sentimentScore < 0 ? 'Negative' : 'Neutral'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(article.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {article.title}
                    </a>
                  </h3>

                  <p className="text-gray-700 dark:text-gray-300 mb-2 line-clamp-3 text-sm">
                    {article.summary}
                  </p>

                  {article.searchItem && (
                    <div className="mt-2 text-xs text-gray-500">
                      Search term: <span className="font-medium">{article.searchItem}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleDownload}
                variant="success"
                disabled={!filteredArticles.length}
              >
                Export Results
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <h3 className="text-xl font-medium mb-1">No results found</h3>
            <p className="text-gray-500">Try adjusting your search terms or filters</p>
          </div>
        )}
      </div>
    </div>
  );

  const AnalyticsSection = () => (
    <div className="mt-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold">Sentiment Analytics</h2>
        </div>

        {articles.positive.length > 0 || articles.neutral.length > 0 || articles.negative.length > 0 ? (
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">

              {/* Line Chart */}
              <Card className="p-4 items-center">
                <h3 className="text-lg font-medium mb-4">Sentiment Trends Over Time</h3>

                <div style={{ width: "100%", height: "400px" }}>
                  <Line data={prepareLineChartData()} options={lineChartOptions} />
                </div>

              </Card>

              {/* Pie Chart */}
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-4">Sentiment Distribution</h3>
                <div style={{ width: "100%", height: "400px" }}>
                  <Pie data={preparePieChartData()} options={pieChartOptions} />
                </div>
                {/* <div className="mt-4 text-sm text-center text-gray-600">
                  <div>Positive: {articles.positive.length} articles</div>
                  <div>Neutral: {articles.neutral.length} articles</div>
                  <div>Negative: {articles.negative.length} articles</div>
                </div> */}
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <h3 className="text-xl font-medium mb-1">No data to analyze</h3>
            <p className="text-gray-500">Run a search to view sentiment analytics</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Online Media Watch
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Monitor and analyze news sentiment across the web
          </p>
        </header>

        {/* Main Content */}
        <main>
          {/* Tabs Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex space-x-2">
              <Tab
                active={activeTab === 'manual'}
                onClick={() => setActiveTab('manual')}
              >
                Keyword Search
              </Tab>

              <Tab
                active={activeTab === 'batch'}
                onClick={() => setActiveTab('batch')}
              >
                Batch Search
              </Tab>

              <Tab
                active={activeTab === 'analytics'}
                onClick={() => setActiveTab('analytics')}
              >
                Analytics
              </Tab>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mb-8">
            {activeTab === 'manual' ? (
              <div>
                <Card>
                  <h2 className="text-xl font-semibold mb-4">Search by Keywords</h2>
                  <FiltersPanel />
                  <form onSubmit={handleManualSearch} className="flex flex-col space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Enter Keywords</label>
                      <Input
                        placeholder="Enter search keywords..."
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                      />
                    </div>
                    <div>
                      <Button
                        type="submit"
                        disabled={loading || !keywords.trim()}
                        className="w-full"
                      >
                        {loading ? 'Searching...' : 'Search'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            ) : activeTab === 'batch' ? (
              <div>
                <Card>
                  <h2 className="text-xl font-semibold mb-4">Batch Search from File</h2>
                  <FiltersPanel />
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                      <label className="text-sm font-medium text-gray-700 mb-2">Upload Excel File with Search Terms</label>

                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />

                      <label className="mt-2 inline-flex items-center px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
                        <span>Select file</span>
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="sr-only" />
                      </label>
                    </div>

                    <div className="text-sm">
                      {searchTerms.length > 0 ? (
                        <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
                          <span className="font-medium">{searchTerms.length}</span> search terms loaded
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {searchTerms.slice(0, 5).join(', ')}
                            {searchTerms.length > 5 && '...'}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">Upload a file with search terms (one per row)</p>
                      )}
                    </div>
                    <div>
                      <Button
                        onClick={handleBatchSearch}
                        disabled={loading || !searchTerms.length}
                        className="w-full"
                      >
                        {loading ? 'Processing...' : 'Search All Terms'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div>
                <Card>
                  <h2 className="text-xl font-semibold mb-4">Sentiment Analytics Dashboard</h2>
                  <FiltersPanel />
                  <p className="text-sm text-gray-600 mb-2">
                    Analyze the sentiment distribution and trends from your search results
                  </p>
                  {!articles.positive.length && !articles.neutral.length && !articles.negative.length && (
                    <p className="text-sm bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
                      Run a search to view sentiment analytics
                    </p>
                  )}
                </Card>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-center items-center my-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Results or Analytics Section based on active tab */}
          {!loading && (activeTab === 'analytics' ? <AnalyticsSection /> :
            filteredArticles.length > 0 && <ResultsSection />)}
        </main>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500 pb-8">
          <p>© {new Date().getFullYear()} Online Media Watch. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}