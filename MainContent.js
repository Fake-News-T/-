import React, { useState, useEffect } from 'react';
import './MainContent.css';

function MainContent({ searchTerm, selectedCategory }) {
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [newsPerPage] = useState(10);
    const [totalNews, setTotalNews] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [showStartInput, setShowStartInput] = useState(false); // 앞쪽 ...
    const [showEndInput, setShowEndInput] = useState(false);     // 뒤쪽 ...
    const [inputPage, setInputPage] = useState('');
    

    

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory]);

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            setError(null);
            try {
                let url = 'http://localhost:5000/api/news';
                const queryParams = [];

                if (searchTerm) {
                    queryParams.push(`query=${searchTerm}`);
                }

                if (selectedCategory) {
                    queryParams.push(`category=${selectedCategory}`);
                }

                queryParams.push(`page=${currentPage}`);
                queryParams.push(`limit=${newsPerPage}`);

                if (queryParams.length > 0) {
                    url += `?${queryParams.join('&')}`;
                }

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setNewsList(data.news);
                setTotalNews(data.total);
                setTotalPages(Math.ceil(data.total / newsPerPage));
                setLoading(false);
            } catch (error) {
                setError(error);
                setLoading(false);
            }
        };

        fetchNews();
    }, [searchTerm, selectedCategory, currentPage, newsPerPage]);

    const paginate = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    const renderPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5; // 현재 페이지 주변으로 보여줄 최대 페이지 수
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(
                <li
                    key={i}
                    className={`page-item ${currentPage === i ? 'active' : ''}`}
                >
                    <button onClick={() => paginate(i)} className="page-link">
                        {i}
                    </button>
                </li>
            );
        }

        return (
            <>
                <li className="page-item">
                    <button onClick={() => paginate(1)} className="page-link" disabled={currentPage === 1}>
                        처음
                    </button>
                </li>
                <li className="page-item">
                    <button onClick={() => paginate(currentPage - 1)} className="page-link" disabled={currentPage === 1}>
                        이전
                    </button>
                </li>
                {startPage > 1 && (
                    <li className="page-item">
                        {showStartInput ? (
                            <input
                            type="number"
                            className="page-jump-input"
                            value={inputPage}
                            onChange={(e) => setInputPage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const pageNum = parseInt(inputPage, 10);
                                    if (pageNum >= 1 && pageNum <= totalPages) {
                                        paginate(pageNum);
                                        setShowStartInput(false);
                                        setInputPage('');
                                    }
                                }
                            }}
                            onBlur={() => setShowStartInput(false)}  // 포커스 벗어나면 숨김
                            placeholder=""
                            min={1}
                            max={totalPages}
                            />
                        ) : (
                        <button className="page-link" onClick={() => setShowStartInput(true)}>
                            ...
                            </button>
                        )}
                        </li>
                    )}
                {pageNumbers}
                {endPage < totalPages && (
                    <li className="page-item">
                        {showEndInput ? (
                            <input
                            type="number"
                            className="page-jump-input"
                            value={inputPage}
                            onChange={(e) => setInputPage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const pageNum = parseInt(inputPage, 10);
                                    if (pageNum >= 1 && pageNum <= totalPages) {
                                        paginate(pageNum);
                                        setShowEndInput(false);
                                        setInputPage('');
                                    }
                                }
                            }}
                            onBlur={() => setShowEndInput(false)}
                            placeholder=""
                            />
                        ) : (
                        <button className="page-link" onClick={() => {
                            setShowEndInput(true);
                            setShowStartInput(false); // 충돌 방지
                            }}>
                                ...
                                </button>
                            )}
                            </li>
                        )}
                <li className="page-item">
                    <button onClick={() => paginate(currentPage + 1)} className="page-link" disabled={currentPage === totalPages}>
                        다음
                    </button>
                </li>
                <li className="page-item">
                    <button onClick={() => paginate(totalPages)} className="page-link" disabled={currentPage === totalPages}>
                        마지막
                    </button>
                </li>
            </>
        );
    };

    if (loading) {
        return <p>Loading news...</p>;
    }

    if (error) {
        return <p>Error fetching news: {error.message}</p>;
    }

    return (
        <div className="main-content">
            <ul className="news-grid">
                {newsList.map((news, index) => (
                    <li key={index} className={`news-article ${news.is_fake_reporter ? 'fake-news-warning' : ''}`}>
                        {news.image_url && (
                            <img src={news.image_url} alt={news.title} className="article-image" />
                        )}
                        <div className="article-details">
                            <h3 className="article-title">{news.title}</h3>
                            <p className="article-summary">{news.description}</p>
                            <div className="reporter-info">
                                <span className="reporter">{news.reporter_name}</span>
                                {news.created && (
                                    <span className="date">{new Date(news.created).toLocaleDateString()}</span>
                                )}
                                {news.link && (
                                    <a href={news.link} target="_blank" rel="noopener noreferrer" className="article-link-inline">
                                        {news.link}
                                    </a>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
            <nav>
                <ul className="pagination">
                    {renderPageNumbers()}
                </ul>
            </nav>
        </div>
    );
}

export default MainContent;