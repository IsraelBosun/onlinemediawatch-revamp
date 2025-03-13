import React, { useState } from 'react';

export const Input = ({ type = 'text', placeholder, value, onChange, className = '' }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full p-3 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
  />
);

export const Card = ({ children, className = '' }) => (
  <div className={`p-5 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-shadow hover:shadow-lg ${className}`}>
    {children}
  </div>
);

export const Tab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 text-sm font-medium focus:outline-none transition-colors duration-200 
      ${active
        ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-800'
        : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:border-b-2 hover:border-blue-300'}`}
  >
    {children}
  </button>
);

export const Button = ({ onClick, disabled, variant = 'primary', children, className = '', type = 'button' }) => {
  const baseStyles = "py-3 px-4 rounded-lg font-medium transition-colors duration-200 focus:outline-none";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
    outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const FiltersPanel = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  return (
    <div className="mb-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">Filters</h3>

      {/* Date range */}
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
};

export const getSentimentColor = (score) => {
    if (score > 0) return 'bg-green-100 text-green-800 border-green-200';
    if (score < 0) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };


  export const ResultsSection = ({
    filteredArticles = [],
    filter,
    setFilter,
    sortOrder,
    setSortOrder,
    getSentimentColor,
    handleDownload
  }) => (
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
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                      {article.title}
                    </a>
                  </h3>
  
                  <p className="text-gray-700 dark:text-gray-300 mb-2 line-clamp-3 text-sm">{article.summary}</p>
  
                  {article.searchItem && (
                    <div className="mt-2 text-xs text-gray-500">
                      Search term: <span className="font-medium">{article.searchItem}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
  
            <div className="mt-6 flex justify-center">
              <Button onClick={handleDownload} variant="success" disabled={!filteredArticles.length}>
                Export Results
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"></svg>
            <p className="text-gray-500">No articles found.</p>
          </div>
        )}
      </div>
    </div>
  );
  
  



// // Reusable components
// const Button = ({ onClick, disabled, variant = 'primary', children, className = '', type = 'button' }) => {
//   const baseStyles = "py-3 px-4 rounded-lg font-medium transition-colors duration-200 focus:outline-none";
//   const variants = {
//     primary: "bg-blue-600 hover:bg-blue-700 text-white",
//     success: "bg-green-600 hover:bg-green-700 text-white",
//     outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
//   };

//   return (
//     <button
//       type={type}
//       onClick={onClick}
//       disabled={disabled}
//       className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
//     >
//       {children}
//     </button>
//   );
// };

// const Input = ({ type = 'text', placeholder, value, onChange, className = '' }) => (
//   <input
//     type={type}
//     placeholder={placeholder}
//     value={value}
//     onChange={onChange}
//     className={`w-full p-3 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
//   />
// );

// const Card = ({ children, className = '' }) => (
//   <div className={`p-5 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-shadow hover:shadow-lg ${className}`}>
//     {children}
//   </div>
// );

// const Tab = ({ active, onClick, children }) => (
//   <button
//     onClick={onClick}
//     className={`px-6 py-3 text-sm font-medium focus:outline-none transition-colors duration-200 
//       ${active
//         ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-800'
//         : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:border-b-2 hover:border-blue-300'}`}
//   >
//     {children}
//   </button>
// );
