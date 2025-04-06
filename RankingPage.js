import React, { useState, useEffect } from 'react';
import './RankingPage.css';
import { FaThumbsUp, FaThumbsDown } from 'react-icons/fa';

function RankingPage({ onArticleClick }) {
    const [rankedArticles, setRankedArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTimeRange, setSelectedTimeRange] = useState('week');
    const [sortOrder, setSortOrder] = useState('recommend');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchRankedArticles = async (timeRange = 'week', page = 1, sort = 'recommend') => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`http://localhost:5000/api/get-ranked-news?time=${timeRange}&page=${page}&sort=${sort}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setRankedArticles(data.articles);
            setTotalPages(data.total_pages);
            setLoading(false);
        } catch (error) {
            setError('랭킹 데이터를 불러오는 데 실패했습니다.');
            setLoading(false);
            console.error('Error fetching ranked articles:', error);
        }
    };

    useEffect(() => {
        fetchRankedArticles(selectedTimeRange, currentPage, sortOrder);
    }, [selectedTimeRange, currentPage, sortOrder]);

    const handleTimeRangeChange = (range) => {
        setSelectedTimeRange(range);
        setCurrentPage(1);
    };

    const handleSortChange = (order) => {
        setSortOrder(order);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    if (loading) return <div>랭킹 데이터를 불러오는 중...</div>;
    if (error) return <div>에러 발생: {error}</div>;

    return (
        <div className="ranking-page">
            <h1 className="ranking-title">기사 랭킹</h1>

            {/* 🟦 파란 박스: 기간 선택 버튼(임의로 추가) */}
            <div className="blue-box">
                <div className="blue-box-inner">
                    <div className="time-range-buttons">
                        <button onClick={() => handleTimeRangeChange('week')} className={selectedTimeRange === 'week' ? 'active' : ''}>
                            이번주 랭킹
                        </button>
                        <button onClick={() => handleTimeRangeChange('month')} className={selectedTimeRange === 'month' ? 'active' : ''}>
                            이번달 랭킹
                        </button>
                    </div>
                </div>
            </div>

            {/* 정렬 방식 선택 버튼 */}
            <div className="sort-buttons">
                <button onClick={() => handleSortChange('recommend')} className={sortOrder === 'recommend' ? 'active' : ''}>추천순</button>
                <button onClick={() => handleSortChange('not_recommend')} className={sortOrder === 'not_recommend' ? 'active' : ''}>비추천순</button>
            </div>

            {/* 기사 목록 */}
            <ul className="ranking-list">
                {rankedArticles.map((article, index) => (
                    <li
                        key={article.article_link}
                        className="ranking-item"
                        onClick={() => onArticleClick(article)}
                    >
                        <div className={`rank-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'default'}`}>
                            {index + 1}
                        </div>
                        <div className="article-content">
                            <h3>{article.title || '[제목 없음]'}</h3>
                            <p className="article-summary">{article.article_summary || '[요약 없음]'}</p>
                            <div className="vote-icons">
                                <span className="vote-item up">
                                    <FaThumbsUp className="vote-icon" /> {article.recommend_count}
                                </span>
                                <span className="vote-item down">
                                    <FaThumbsDown className="vote-icon" /> {article.not_recommend_count}
                                </span>
                                <span className="comment-count">💬 {article.comment_count || 0}</span>
                            </div>
                            <p className="article-link">
                                <a href={article.article_link} target="_blank" rel="noopener noreferrer">원본 기사 링크</a>
                            </p>
                        </div>
                    </li>
                ))}
            </ul>

            {/* 페이지네이션 */}
            <div className="pagination">
                {currentPage > 1 && (
                    <>
                        <button onClick={() => handlePageChange(1)}>처음</button>
                        <button onClick={() => handlePageChange(currentPage - 1)}>이전</button>
                    </>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => Math.abs(currentPage - page) <= 2 || page === 1 || page === totalPages)
                    .reduce((acc, page, idx, arr) => {
                        if (idx > 0 && page - arr[idx - 1] > 1) acc.push('...');
                        acc.push(page);
                        return acc;
                    }, [])
                    .map((item, index) =>
                        item === '...' ? (
                            <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                        ) : (
                            <button key={item} onClick={() => handlePageChange(item)} className={currentPage === item ? 'active' : ''}>{item}</button>
                        )
                    )}
                {currentPage < totalPages && (
                    <>
                        <button onClick={() => handlePageChange(currentPage + 1)}>다음</button>
                        <button onClick={() => handlePageChange(totalPages)}>마지막</button>
                    </>
                )}
            </div>
        </div>
    );
}

export default RankingPage;
