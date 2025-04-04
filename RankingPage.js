// components/RankingPage.js
import React, { useState, useEffect } from 'react';
import './RankingPage.css'; // 필요하다면 스타일 파일 import

function RankingPage() {
    const [rankedArticles, setRankedArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTimeRange, setSelectedTimeRange] = useState('week'); // 기본값: 이번주 랭킹

    const fetchRankedArticles = async (timeRange = 'week') => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`http://localhost:5000/api/get-ranked-news?time=${timeRange}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setRankedArticles(data.articles);
            setLoading(false);
        } catch (error) {
            setError('랭킹 데이터를 불러오는 데 실패했습니다.');
            setLoading(false);
            console.error('Error fetching ranked articles:', error);
        }
    };

    useEffect(() => {
        fetchRankedArticles(selectedTimeRange);
    }, [selectedTimeRange]);

    const handleTimeRangeChange = (range) => {
        setSelectedTimeRange(range);
    };

    if (loading) {
        return <div>랭킹 데이터를 불러오는 중...</div>;
    }

    if (error) {
        return <div>에러 발생: {error}</div>;
    }

    return (
        <div className="ranking-page">
            <h2>추천 순위</h2>
            <div className="time-range-buttons">
                <button
                    onClick={() => handleTimeRangeChange('week')}
                    className={selectedTimeRange === 'week' ? 'active' : ''}
                >
                    이번주 랭킹
                </button>
                <button
                    onClick={() => handleTimeRangeChange('month')}
                    className={selectedTimeRange === 'month' ? 'active' : ''}
                >
                    이번달 랭킹
                </button>
            </div>
            <ul>
                {rankedArticles.map((article, index) => (
                    <li key={article.article_link}>
                        <span>{index + 1}.</span> {/* 순위 표시 */}
                        {/* 이미지 표시 (이미지 URL이 article 객체에 있다면) */}
                        {/* {article.image_url && <img src={article.image_url} alt="기사 이미지" />} */}
                        {/* 이미지 URL이 없다면 대체 텍스트 또는 컴포넌트 */}
                        <div className="article-content">
                            <h3>
                                <a href={article.article_link} target="_blank" rel="noopener noreferrer">
                                    {article.article_summary || article.article_link}
                                </a>
                            </h3>
                            <p>
                                추천: {article.recommend_count} / 비추천: {article.not_recommend_count}
                            </p>
                            <p className="article-link">
                                <a href={article.article_link} target="_blank" rel="noopener noreferrer">
                                    원본 기사 링크
                                </a>
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default RankingPage;