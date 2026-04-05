'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Input, Card, Tab, Button, getSentimentColor, StatCard, SkeletonCard } from './components/DateFilter';
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

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function NewsSearch() {
  const [activeTab, setActiveTab] = useState('manual');
  const [keywords, setKeywords] = useState('');
  const [articles, setArticles] = useState({ positive: [], neutral: [], negative: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerms, setSearchTerms] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [preSearchFilter, setPreSearchFilter] = useState('all');
  const [selectedSentiments, setSelectedSentiments] = useState({ positive: true, neutral: true, negative: true });

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
      const classification = article.sentimentScore > 0 ? 'Positive' : article.sentimentScore < 0 ? 'Negative' : 'Neutral';
      return [article.searchItem || keywords, article.title, article.link, classification, new Date(article.date).toLocaleString()];
    });
    const header = ['Search Item', 'Headline', 'Link', 'Classification', 'Date'];
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, 'news_results.xlsx');
  };

  const filterByDate = (list) => list.filter((article) => {
    const d = new Date(article.date);
    const fromOk = fromDate ? d >= new Date(fromDate) : true;
    const toOk = toDate ? d <= new Date(toDate) : true;
    return fromOk && toOk;
  });

  const preparePieChartData = () => {
    const pos = filterByDate(articles.positive).length;
    const neu = filterByDate(articles.neutral).length;
    const neg = filterByDate(articles.negative).length;
    return {
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [{
        data: [pos, neu, neg],
        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderColor: ['rgb(16, 185, 129)', 'rgb(245, 158, 11)', 'rgb(239, 68, 68)'],
        borderWidth: 2,
      }],
    };
  };

  const prepareLineChartData = () => {
    const dateMap = new Map();
    const filtered = {
      positive: filterByDate(articles.positive),
      neutral: filterByDate(articles.neutral),
      negative: filterByDate(articles.negative),
    };

    Object.entries(filtered).forEach(([sentiment, list]) => {
      if (selectedSentiments[sentiment]) {
        list.forEach(article => {
          const date = new Date(article.date).toISOString().split('T')[0];
          if (!dateMap.has(date)) dateMap.set(date, { positive: 0, neutral: 0, negative: 0 });
          dateMap.get(date)[sentiment]++;
        });
      }
    });

    const sortedDates = Array.from(dateMap.keys()).sort();
    const datasets = [];

    if (selectedSentiments.positive) datasets.push({
      label: 'Positive',
      data: sortedDates.map(d => dateMap.get(d).positive),
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: 'rgb(16, 185, 129)',
      pointRadius: 4,
      pointHoverRadius: 6,
    });
    if (selectedSentiments.neutral) datasets.push({
      label: 'Neutral',
      data: sortedDates.map(d => dateMap.get(d).neutral),
      borderColor: 'rgb(245, 158, 11)',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: 'rgb(245, 158, 11)',
      pointRadius: 4,
      pointHoverRadius: 6,
    });
    if (selectedSentiments.negative) datasets.push({
      label: 'Negative',
      data: sortedDates.map(d => dateMap.get(d).negative),
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: 'rgb(239, 68, 68)',
      pointRadius: 4,
      pointHoverRadius: 6,
    });

    return { labels: sortedDates, datasets };
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#94a3b8', font: { size: 11 } },
        title: { display: true, text: 'Articles', color: '#64748b', font: { size: 11 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11 } },
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94a3b8', padding: 16, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        padding: 12,
        cornerRadius: 10,
      },
    },
  };

  const toggleSentiment = (sentiment) => {
    setSelectedSentiments(prev => ({ ...prev, [sentiment]: !prev[sentiment] }));
  };

  const hasArticles = articles.positive.length > 0 || articles.neutral.length > 0 || articles.negative.length > 0;

  // --- Inline sub-components ---

  const FiltersPanel = () => (
    <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Date Range</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">From</label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">To</label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>
    </div>
  );

  const ArticleCard = ({ article }) => {
    const isPositive = article.sentimentScore > 0;
    const isNegative = article.sentimentScore < 0;
    const topBarColor = isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-amber-500';
    const label = isPositive ? 'Positive' : isNegative ? 'Negative' : 'Neutral';

    return (
      <div className="group rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-200 animate-fade-in flex flex-col">
        <div className={`h-1 w-full ${topBarColor}`} />
        <div className="p-5 flex flex-col gap-3 flex-1">
          <div className="flex justify-between items-start gap-2">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getSentimentColor(article.sentimentScore)}`}>
              {label}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
              {new Date(article.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h3 className="text-sm font-semibold leading-snug line-clamp-2">
            <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {article.title}
            </a>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed flex-1">
            {article.summary}
          </p>
          {article.searchItem && (
            <div className="pt-1 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-xs text-slate-400">Term: </span>
              <span className="text-xs font-medium text-blue-500 dark:text-blue-400">{article.searchItem}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ResultsSection = () => {
    const total = filteredArticles.length;
    const posCount = filteredArticles.filter(a => a.sentimentScore > 0).length;
    const neuCount = filteredArticles.filter(a => a.sentimentScore === 0).length;
    const negCount = filteredArticles.filter(a => a.sentimentScore < 0).length;

    return (
      <div className="mt-8 animate-fade-in">
        {/* Results header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Results
              <span className="ml-2 text-sm font-normal text-slate-400">({total} articles)</span>
            </h2>
            {total > 0 && (
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {posCount} positive
                </span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  {neuCount} neutral
                </span>
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  {negCount} negative
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="py-2 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
            >
              <option value="all">All Sentiment</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="py-2 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <Button onClick={handleDownload} variant="success" disabled={!filteredArticles.length}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
          </div>
        </div>

        {filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArticles.map((article, index) => (
              <ArticleCard key={index} article={article} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">No results found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search terms or filters</p>
          </div>
        )}
      </div>
    );
  };

  const AnalyticsSection = () => {
    const pos = filterByDate(articles.positive).length;
    const neu = filterByDate(articles.neutral).length;
    const neg = filterByDate(articles.negative).length;
    const total = pos + neu + neg;
    const pct = (n) => total ? Math.round((n / total) * 100) : 0;

    const sentimentToggles = [
      { key: 'positive', label: 'Positive', activeClass: 'bg-emerald-500 text-white border-transparent', inactiveClass: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 opacity-50' },
      { key: 'neutral', label: 'Neutral', activeClass: 'bg-amber-500 text-white border-transparent', inactiveClass: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 opacity-50' },
      { key: 'negative', label: 'Negative', activeClass: 'bg-rose-500 text-white border-transparent', inactiveClass: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 opacity-50' },
    ];

    const breakdownItems = [
      { label: 'Positive', count: pos, barColor: 'bg-emerald-500', trackColor: 'bg-emerald-100 dark:bg-emerald-900/20', textColor: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Neutral', count: neu, barColor: 'bg-amber-500', trackColor: 'bg-amber-100 dark:bg-amber-900/20', textColor: 'text-amber-600 dark:text-amber-400' },
      { label: 'Negative', count: neg, barColor: 'bg-rose-500', trackColor: 'bg-rose-100 dark:bg-rose-900/20', textColor: 'text-rose-600 dark:text-rose-400' },
    ];

    if (!hasArticles) {
      return (
        <div className="mt-6 flex flex-col items-center justify-center py-24 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-600 dark:text-slate-300 text-lg">No data yet</p>
          <p className="text-sm text-slate-400 mt-1.5 max-w-xs">Run a keyword or batch search first to see sentiment analytics here.</p>
          <Button onClick={() => setActiveTab('manual')} variant="outline" className="mt-5">
            Go to Search
          </Button>
        </div>
      );
    }

    return (
      <div className="mt-6 space-y-6 animate-fade-in">

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Articles"
            value={total}
            colorClass="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400"
          />
          <StatCard
            label="Positive"
            value={pos}
            percentage={pct(pos)}
            colorClass="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400"
          />
          <StatCard
            label="Neutral"
            value={neu}
            percentage={pct(neu)}
            colorClass="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400"
          />
          <StatCard
            label="Negative"
            value={neg}
            percentage={pct(neg)}
            colorClass="bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400"
          />
        </div>

        {/* Trend chart */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Sentiment Trends Over Time</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily article volume by sentiment</p>
            </div>
            <div className="flex items-center gap-2">
              {sentimentToggles.map(({ key, label, activeClass, inactiveClass }) => (
                <button
                  key={key}
                  onClick={() => toggleSentiment(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${selectedSentiments[key] ? activeClass : inactiveClass}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5" style={{ height: 320 }}>
            <Line data={prepareLineChartData()} options={lineChartOptions} />
          </div>
        </div>

        {/* Pie + Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Pie chart */}
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Sentiment Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">Share of positive, neutral, and negative coverage</p>
            </div>
            <div className="p-5" style={{ height: 300 }}>
              <Pie data={preparePieChartData()} options={pieChartOptions} />
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Coverage Breakdown</h3>
              <p className="text-xs text-slate-400 mt-0.5">Proportion of each sentiment category</p>
            </div>
            <div className="p-5 flex flex-col gap-6 justify-center h-[300px]">
              {breakdownItems.map(({ label, count, barColor, trackColor, textColor }) => {
                const p = pct(count);
                return (
                  <div key={label}>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className={`text-sm font-semibold ${textColor}`}>{label}</span>
                      <span className="text-xs text-slate-400 font-medium">{count} articles &mdash; {p}%</span>
                    </div>
                    <div className={`h-2.5 rounded-full ${trackColor} overflow-hidden`}>
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    );
  };

  // --- Main render ---

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <div className="container mx-auto px-4 py-10 max-w-5xl">

        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse-dot" />
            Live
          </div>
          <h1 className="text-5xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 leading-tight">
            Online Media Watch
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
            Monitor and analyze news sentiment from across the web in real time.
          </p>
        </header>

        {/* Tab nav */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-1.5 flex gap-1 border border-slate-200 dark:border-slate-700/50">
            <Tab active={activeTab === 'manual'} onClick={() => setActiveTab('manual')}>
              Keyword Search
            </Tab>
            <Tab active={activeTab === 'batch'} onClick={() => setActiveTab('batch')}>
              Batch Search
            </Tab>
            <Tab active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
              Analytics
            </Tab>
          </div>
        </div>

        {/* Tab content */}
        <main>
          {activeTab === 'manual' && (
            <div className="animate-fade-in">
              <Card className="p-6">
                <h2 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-4">Search by Keyword</h2>
                <FiltersPanel />
                <form onSubmit={handleManualSearch} className="flex flex-col gap-3">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keywords</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Enter search keywords..."
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={loading || !keywords.trim()}>
                      {loading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                          </svg>
                          Searching
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {activeTab === 'batch' && (
            <div className="animate-fade-in">
              <Card className="p-6">
                <h2 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-4">Batch Search from File</h2>
                <FiltersPanel />
                <div className="flex flex-col gap-4">
                  <label
                    htmlFor="file-upload"
                    className="group flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/20 flex items-center justify-center transition-colors">
                      <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Click to upload Excel file
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">.xlsx or .xls — one search term per row</p>
                    </div>
                    <input id="file-upload" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="sr-only" />
                  </label>

                  {searchTerms.length > 0 ? (
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                          {searchTerms.length} terms loaded
                        </span>
                      </div>
                      <p className="text-xs text-blue-500 dark:text-blue-500 ml-6">
                        {searchTerms.slice(0, 5).join(', ')}{searchTerms.length > 5 ? ` +${searchTerms.length - 5} more` : ''}
                      </p>
                    </div>
                  ) : null}

                  <Button
                    onClick={handleBatchSearch}
                    disabled={loading || !searchTerms.length}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                        </svg>
                        Processing {searchTerms.length} terms...
                      </>
                    ) : 'Search All Terms'}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="animate-fade-in">
              <Card className="p-6">
                <h2 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">Sentiment Analytics</h2>
                <p className="text-xs text-slate-400 mb-4">Insights from your current search results</p>
                <FiltersPanel />
              </Card>
              <AnalyticsSection />
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mt-5 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400 rounded-xl flex items-center gap-3 animate-fade-in">
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && activeTab !== 'analytics' && filteredArticles.length > 0 && <ResultsSection />}
        </main>

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-slate-400 pb-6">
          &copy; {new Date().getFullYear()} Online Media Watch. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
