import React, { useState, useEffect } from 'react';
import './mypage.css';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookmark } from '@fortawesome/free-solid-svg-icons';

function MyPage({ isLoggedIn, loggedInUsername, onLogout }) {
    const [history, setHistory] = useState([]);
    const [bookmarkedNews, setBookmarkedNews] = useState([]);
    const [recommendedNews, setRecommendedNews] = useState([]); // 추천 뉴스 상태 추가
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn && loggedInUsername) {
            setLoading(true);
            Promise.all([
                fetch(`http://localhost:5000/api/history`, {
                    headers: {
                        'Authorization': loggedInUsername,
                    },
                }).then(response => {
                    if (!response.ok) {
                        throw new Error(`기록 불러오기 실패: ${response.statusText}`);
                    }
                    return response.json();
                }),
                fetch('http://localhost:5000/api/bookmarks', {
                    headers: {
                        'Authorization': loggedInUsername,
                    },
                }).then(response => {
                    if (!response.ok) {
                        throw new Error(`북마크 불러오기 실패: ${response.statusText}`);
                    }
                    return response.json();
                }),
                fetch('http://localhost:5000/api/recommendations', { // 추천 뉴스 API 호출
                    headers: {
                        'Authorization': loggedInUsername,
                    },
                }).then(response => {
                    if (!response.ok) {
                        throw new Error(`추천 뉴스 불러오기 실패: ${response.statusText}`);
                    }
                    return response.json();
                })
            ])
            .then(([historyData, bookmarksData, recommendationsData]) => {
                setHistory(historyData);
                setBookmarkedNews(bookmarksData.bookmarks);
                setRecommendedNews(recommendationsData.recommendations); // 추천 뉴스 데이터 설정
                setLoading(false);
            })
            .catch(error => {
                setError(error.message);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [isLoggedIn, loggedInUsername]);

    const handleUnbookmark = (articleId, articleLink) => {
        fetch(`http://localhost:5000/api/bookmark`, {
            method: 'DELETE',
            headers: {
                'Authorization': loggedInUsername,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ article_link: articleLink }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`북마크 해제 실패: ${response.statusText}`);
            }
            // 🔁 북마크 전체 다시 불러오기
            return fetch('http://localhost:5000/api/bookmarks', {
                headers: {
                    'Authorization': loggedInUsername,
                },
            });
        })
        .then(response => response.json())
        .then(data => {
            setBookmarkedNews(data.bookmarks); // 전체 다시 세팅
        })
        .catch(error => {
            console.error("북마크 해제 오류:", error);
            alert(`북마크 해제 중 오류가 발생했습니다: ${error}`);
        });
    };
    

    const handleDeleteAccount = () => {
        if (window.confirm("정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            setLoading(true);
            fetch(`http://localhost:5000/api/delete-account`, {
                method: 'DELETE',
                headers: {
                    'Authorization': loggedInUsername,
                },
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`계정 삭제 실패: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                alert(data.message);
                onLogout();
                navigate('/');
            })
            .catch(error => {
                setError(error.message);
                alert(`계정 삭제 중 오류가 발생했습니다: ${error}`);
            })
            .finally(() => {
                setLoading(false);
            });
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="mypage">
                <h1>마이페이지</h1>
                <p>로그인 후 이용 가능합니다.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="mypage">
                <h1>마이페이지</h1>
                <p>데이터를 불러오는 중입니다...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mypage">
                <h1>마이페이지</h1>
                <p style={{ color: 'red' }}>오류: {error}</p>
            </div>
        );
    }

    return (
        <><div className="mypage-subheader-wrapper">
            <h1 className="mypage-title">마이페이지</h1>
            <div className="mypage-subheader">
                <p>내 활동을 한눈에 확인하고, 분석 기록을 돌아보세요</p>
            </div>
        </div>
        <div className="mypage">
                

                <section className="personalized-recommendations">
                    <h2>사용자 맞춤형 기사 추천</h2>
                    <div className="recommendation-list">
                        {recommendedNews.slice(0, 2).map((article, index) => (
                            <div key={index} className="recommendation-item">
                                <a href={article.link} target="_blank" rel="noopener noreferrer">{article.title}</a>
                            </div>
                        ))}
                    </div>
                </section>

                <h2>최근 분석 기록</h2>
                {history.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>제목</th>
                                <th>URL</th>
                                <th>기자</th>
                                <th>분석 시간</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(record => (
                                <tr key={record.id}>
                                    <td>{record.article_title}</td>
                                    <td>
                                        <a href={record.article_url} target="_blank" rel="noopener noreferrer">{record.article_url}</a>
                                    </td>
                                    <td>{record.reporter_name}</td>
                                    <td>{new Date(record.timestamp).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>최근 분석 기록이 없습니다.</p>
                )}

                <h2 style={{ marginTop: '30px' }}>북마크한 기사</h2>
                {bookmarkedNews.length > 0 ? (
                    <table className="bookmarked-table">
                        <thead>
                            <tr>
                                <th>제목</th>
                                <th>홈페이지</th>
                                <th>북마크</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookmarkedNews.map((article, index) => (
                                <tr key={index} className="bookmarked-item">
                                    <td>
                                        <a href={article.article_link} target="_blank" rel="noopener noreferrer">
                                            {article.title}
                                        </a>
                                    </td>
                                    <td>
                                        <a href={article.article_link.substring(0, article.article_link.indexOf('/', 8)) || article.article_link} target="_blank" rel="noopener noreferrer">
                                            {article.article_link.substring(0, article.article_link.indexOf('/', 8)) || article.article_link}
                                        </a>
                                    </td>
                                    <td className="mypage-bookmark-action">
                                        <FontAwesomeIcon
                                            icon={faBookmark}
                                            className="mypage-bookmark-icon"
                                            onClick={() => handleUnbookmark(article.id, article.article_link)} // article.article_link 추가
                                            style={{ cursor: 'pointer' }} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>북마크한 기사가 없습니다.</p>
                )}

                <button className="delete-account-button" onClick={handleDeleteAccount} disabled={loading}>
                    계정 삭제
                </button>
            </div></>
    );
}

export default MyPage;