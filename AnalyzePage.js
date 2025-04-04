import React, { useState } from 'react';
import './AnalyzePage.css';
import { AiOutlineSearch } from 'react-icons/ai'; // 돋보기 아이콘

function AnalyzePage({ isLoggedIn, loggedInUsername }) {
    const [articleLink, setArticleLink] = useState('');
    const [articleBody, setArticleBody] = useState('');
    const [summary, setSummary] = useState('');
    const [error, setError] = useState('');
    const [riskLevelInfo, setRiskLevelInfo] = useState(null); // 위험도 정보를 객체 형태로 저장
    const [isFetchingArticle, setIsFetchingArticle] = useState(false); // 기사 가져오는 중 상태 관리
    const [isSummarizing, setIsSummarizing] = useState(false); // 요약 중 상태 관리

    const handleFetchArticle = async () => {
        setError('');
        setArticleBody('');
        setSummary(''); // 기존 요약 결과 초기화
        setRiskLevelInfo(null); // 기존 위험도 정보 초기화
        setIsFetchingArticle(true); // 기사 가져오는 시작 상태로 설정
        try {
            const response = await fetch('http://localhost:5000/api/fetch-article', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ link: articleLink }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`본문 추출 실패: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            setArticleBody(data.article_body);
            setRiskLevelInfo(data.reporter_risk); // 위험도 정보 저장
            setIsFetchingArticle(false); // 기사 가져오기 완료
        } catch (err) {
            setError(err.message);
            setIsFetchingArticle(false); // 오류 발생 시 기사 가져오는 상태 해제
        }
    };

    const handleSummarizeArticle = async () => {
        setError('');
        setSummary(''); // 기존 요약 결과 초기화
        setIsSummarizing(true); // 요약 시작 상태로 설정
        try {
            const response = await fetch('http://localhost:5000/api/summarize-article', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ article_body: articleBody }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`요약 실패: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            setSummary(data.summary);
            setIsSummarizing(false); // 요약 완료
        } catch (err) {
            setError(err.message);
            setIsSummarizing(false); // 오류 발생 시 요약 중 상태 해제
        }
    };

    const handleRecommend = async () => {
        if (!isLoggedIn) {
            setError('로그인 후 이용 가능합니다.');
            return;
        }
        const articleData = {
            article_link: articleLink,
            article_summary: summary, // 현재 요약 내용 포함
        };
        try {
            const response = await fetch('http://localhost:5000/api/recommend-article', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': loggedInUsername, // 사용자 아이디를 헤더에 포함
                },
                body: JSON.stringify(articleData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`추천 실패: ${errorData.error || response.statusText}`);
            }
            const data = await response.json();
            alert(data.message); // 성공 메시지 표시
        } catch (err) {
            setError(err.message);
        }
    };

    const handleNotRecommend = async () => {
        if (!isLoggedIn) {
            setError('로그인 후 이용 가능합니다.');
            return;
        }
        const articleData = {
            article_link: articleLink,
            article_summary: summary, // 현재 요약 내용 포함
        };
        try {
            const response = await fetch('http://localhost:5000/api/not-recommend-article', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': loggedInUsername, // 사용자 아이디를 헤더에 포함
                },
                body: JSON.stringify(articleData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`비추천 실패: ${errorData.error || response.statusText}`);
            }
            const data = await response.json();
            alert(data.message); // 성공 메시지 표시
        } catch (err) {
            setError(err.message);
        }
    };

    const getRiskLevelText = (level) => {
        switch (level) {
            case "매우 위험":
                return "매우 위험";
            case "높음":
                return "높음";
            case "보통":
                return "보통";
            case "미약":
                return "미약";
            case "안전":
                return "안전";
            case "기자 정보 없음":
                return "기자 정보 없음";
            default:
                return "알 수 없음";
        }
    };

    const getRiskLevelImage = (level) => {
        switch (level) {
            case "매우 위험":
                return "/images/risk/risk_level_5.png";
            case "높음":
                return "/images/risk/risk_level_4.png";
            case "보통":
                return "/images/risk/risk_level_3.png";
            case "미약":
                return "/images/risk/risk_level_2.png";
            case "안전":
                return "/images/risk/risk_level_1.png";
            default:
                return null;
        }
    };

    const getRiskColor = (level) => {
        switch (level) {
            case "매우 위험":
                return "#b30000"; // 진한 빨강
            case "높음":
                return "#ff4d4f"; // 일반 빨강
            case "보통":
                return "#ffa500"; // 주황
            case "미약":
                return "#f39c12"; // 노랑+주황
            case "안전":
                return "#28a745"; // 초록
            default:
                return "#ccc"; // 회색
                }
            };

    return (
        <div className="analyze-page">
            <h2>기사 분석 및 요약</h2>
            <div className="A-search-bar">
                <AiOutlineSearch className="A-search-icon" />
                <input
                type="text"
                id="articleLink"
                value={articleLink}
                onChange={(e) => setArticleLink(e.target.value)}
                placeholder="뉴스 링크를 입력하세요"
                />
                <button onClick={handleFetchArticle} disabled={isFetchingArticle || isSummarizing}>
                    기사 본문 가져오기
                    </button>
                    </div>
                    {isFetchingArticle && <p style={{ marginTop: '10px' }}>기사 본문을 가져오는 중입니다...</p>}
            {error && <p style={{ color: 'red' }}>오류: {error}</p>}
            
            {articleBody && (
                <div className="article-summary-container">
                    <div className="article-section">
                        <h3>기사 원문</h3>
                        <textarea
                            value={articleBody}
                            rows="15"
                            cols="60" // 너비 조정
                            readOnly
                            style={{ height: '300px', overflowY: 'auto' }} // 높이 고정 및 스크롤 추가
                        />
                    </div>
                    <button onClick={handleSummarizeArticle} disabled={!articleBody || isSummarizing || isFetchingArticle}>
                        요약 하기
                    </button>
                    {isSummarizing && <p>요약 작업이 진행 중입니다...</p>}
                    <div className="summary-section">
                        <h3>기사 요약</h3>
                        <textarea
                            value={summary}
                            rows="15"
                            cols="60" // 너비 조정
                            readOnly
                            style={{ height: '300px', overflowY: 'auto' }} // 높이 고정 및 스크롤 추가
                        />
                    </div>
                </div>
            )}

            {riskLevelInfo && (
                <div
                className="risk-section"
                style={{
                    borderLeft: `6px solid ${getRiskColor(riskLevelInfo.risk_level)}`
                }}>
                    <h3>위험도</h3>
                    <p>
                        기자: {riskLevelInfo.reporter_name} <br />
                        위험도: {getRiskLevelText(riskLevelInfo.risk_level)} ({riskLevelInfo.mention_count_in_table}번 언급)
                    </p>
                    {getRiskLevelImage(riskLevelInfo.risk_level) && ( //이미지 추가가
                        <img
                        src={getRiskLevelImage(riskLevelInfo.risk_level)}
                        alt={riskLevelInfo.risk_level}
                        className="risk-gauge-image"
                        />
                        )}
                        </div>
                    )}
            {articleBody && (
                <div className="vote-section">
                    <h3>이 분석이 도움이 되었나요?</h3>
                    <div>
                        <button onClick={handleRecommend} disabled={!isLoggedIn}>
                            👍추천
                        </button>
                        <button onClick={handleNotRecommend} disabled={!isLoggedIn}>
                            👎비추천
                        </button>
                    </div>
                    {!isLoggedIn && <p style={{ color: 'gray' }}>로그인 후 이용 가능합니다.</p>}
                </div>
            )}
        </div>
    );
}

export default AnalyzePage;