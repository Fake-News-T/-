import React, { useState, useEffect } from 'react';
import './MainContent.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookmark as faBookmarkSolid, faBookmark as faBookmarkRegular } from '@fortawesome/free-solid-svg-icons';

function MainContent({ searchTerm, selectedCategory, isLoggedIn, loggedInUsername }) {
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [newsPerPage] = useState(10);
    const [totalNews, setTotalNews] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [bookmarkedArticles, setBookmarkedArticles] = useState({}); // 북마크 상태를 객체로 관리 (key: article link, value: boolean)
    const [showStartInput, setShowStartInput] = useState(false); // 앞쪽 ...
    const [showEndInput, setShowEndInput] = useState(false);       // 뒤쪽 ...
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

    useEffect(() => {
        const fetchBookmarks = async () => {
            if (isLoggedIn && loggedInUsername) {
                try {
                    const response = await fetch('http://localhost:5000/api/bookmarks', {
                        headers: {
                            'Authorization': loggedInUsername,
                        },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const initialBookmarks = {};
                        data.bookmarks.forEach(bookmark => {
                            initialBookmarks[bookmark.article_link] = true;
                        });
                        setBookmarkedArticles(initialBookmarks);
                    } else {
                        console.error('북마크 정보 불러오기 실패');
                    }
                } catch (error) {
                    console.error('북마크 정보 불러오기 오류:', error);
                }
            } else {
                setBookmarkedArticles({});
            }
        };

        fetchBookmarks();
    }, [isLoggedIn, loggedInUsername]);

    const paginate = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    const renderPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;
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
                                onBlur={() => setShowStartInput(false)}   // 포커스 벗어나면 숨김
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

    const handleBookmarkClick = async (articleLink) => {
        if (!isLoggedIn || !loggedInUsername) {
            alert('로그인이 필요합니다.');
            return;
        }

        const isCurrentlyBookmarked = bookmarkedArticles[articleLink];
        const method = isCurrentlyBookmarked ? 'DELETE' : 'POST';
        const message = isCurrentlyBookmarked ? '북마크 취소' : '북마크';

        try {
            const response = await fetch('http://localhost:5000/api/bookmark', {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': loggedInUsername,
                },
                body: JSON.stringify({ article_link: articleLink }),
            });

            if (response.ok) {
                setBookmarkedArticles({
                    ...bookmarkedArticles,
                    [articleLink]: !isCurrentlyBookmarked,
                });
                alert(`기사를 ${message}했습니다.`);
            } else if (response.status === 404 && method === 'DELETE') {
                setBookmarkedArticles({
                    ...bookmarkedArticles,
                    [articleLink]: false,
                });
                alert('북마크를 찾을 수 없어 취소하지 못했습니다.');
            } else if (response.status === 409 && method === 'POST') {
                setBookmarkedArticles({
                    ...bookmarkedArticles,
                    [articleLink]: true,
                });
                alert('이미 북마크한 기사입니다.');
            } else {
                const errorData = await response.json();
                console.error(`${message} 실패:`, errorData);
                alert(`${message}에 실패했습니다.`);
            }
        } catch (error) {
            console.error(`${message} 요청 오류:`, error);
            alert(`${message} 요청 중 오류가 발생했습니다.`);
        }
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
                    <div className="article-left">
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
                    </div>
                    {/* 북마크 영역 */}
                    <div
                      className={`bookmark-area ${bookmarkedArticles[news.link] ? 'bookmarked' : ''}`}
                      onClick={() => handleBookmarkClick(news.link)}
                    >
                      <FontAwesomeIcon icon={faBookmarkSolid} className="bookmark-icon" />
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