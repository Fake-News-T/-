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
    const [politicalLeaning, setPoliticalLeaning] = useState(null); // 정치적 성향 분석 결과 상태
    const [isAnalyzingPoliticalLeaning, setIsAnalyzingPoliticalLeaning] = useState(false); // 정치적 성향 분석 중 상태 관리
    const [sourceInfo, setSourceInfo] = useState(null); // 출처 정보 상태 (문자열)
    const [isDetectingSource, setIsDetectingSource] = useState(false); // 출처 파악 중 상태 관리
    const [factCheckResult, setFactCheckResult] = useState(null); // 유사 해외 기사 검색 결과 상태
    const [isFactChecking, setIsFactChecking] = useState(false); // 유사 해외 기사 검색 중 상태 관리
    const [translatedSummary, setTranslatedSummary] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('en'); // 기본 언어 영어로 설정
    const [isTranslatingSummary, setIsTranslatingSummary] = useState(false); // 요약본 번역 중 상태

    const handleFetchArticle = async () => {
        setError('');
        setArticleBody('');
        setSummary(''); // 기존 요약 결과 초기화
        setTranslatedSummary(''); // 기존 번역된 요약 초기화
        setRiskLevelInfo(null); // 기존 위험도 정보 초기화
        setPoliticalLeaning(null); // 기존 정치적 성향 분석 결과 초기화
        setSourceInfo(null); // 기존 출처 정보 초기화
        setFactCheckResult(null); // 기존 유사 해외 기사 검색 결과 초기화
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

            // MyPage 기록 저장 API 호출
            if (isLoggedIn && loggedInUsername && data.article_title && data.reporter_risk?.reporter_name) {
                try {
                    const saveResponse = await fetch('http://localhost:5000/api/save-history', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': loggedInUsername,
                        },
                        body: JSON.stringify({
                            article_url: articleLink,
                            article_title: data.article_title,
                            reporter_name: data.reporter_risk.reporter_name,
                        }),
                    });
                    if (!saveResponse.ok) {
                        console.error('기록 저장 실패:', await saveResponse.json());
                    } else {
                        console.log('기록 저장 성공:', await saveResponse.json());
                    }
                } catch (saveError) {
                    console.error('기록 저장 중 오류:', saveError);
                }
            }

        } catch (err) {
            setError(err.message);
            setIsFetchingArticle(false); // 오류 발생 시 기사 가져오는 상태 해제
        }

    };

    const handleAnalyzePoliticalLeaning = async (body) => {
        setIsAnalyzingPoliticalLeaning(true);
        setPoliticalLeaning(null); // 기존 분석 결과 초기화
        try {
            const response = await fetch('http://localhost:5000/api/analyze-political-leaning', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ article_body: body }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`정치적 성향 분석 실패: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            setPoliticalLeaning(data.leaning); // backend에서 'leaning' 키로 정치적 성향 결과 반환한다고 가정
        } catch (err) {
            setError(prevError => prevError ? `${prevError}\n${err.message}` : err.message);
        } finally {
            setIsAnalyzingPoliticalLeaning(false);
        }
    };

    const handleSummarizeArticle = async () => {
        setError('');
        setSummary(''); // 기존 요약 결과 초기화
        setTranslatedSummary(''); // 기존 번역된 요약 초기화
        setPoliticalLeaning(null); // 기존 정치적 성향 분석 결과 초기화
        setSourceInfo(null); // 기존 출처 정보 초기화
        setFactCheckResult(null); // 기존 유사 해외 기사 검색 결과 초기화
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
            handleDetectSource(articleBody); // 요약 완료 후 출처 파악
            handleAnalyzePoliticalLeaning(articleBody);
            // 요약 완료 후 유사 해외 기사 검색 시작
            handleFactCheck(data.summary);
        } catch (err) {
            setError(err.message);
            setIsSummarizing(false); // 오류 발생 시 요약 중 상태 해제
        }
    };

    const handleDetectSource = async (body) => {
        setIsDetectingSource(true);
        setSourceInfo(null);
        try {
            const response = await fetch('http://localhost:5000/api/detect-source', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ article_body: body }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`출처 파악 실패: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            setSourceInfo(data.source_info); // 출처 정보를 문자열 형태로 저장
        } catch (err) {
            setError(prevError => prevError ? `${prevError}\n${err.message}` : err.message);
        } finally {
            setIsDetectingSource(false);
        }
    };

    const handleFactCheck = async (koreanSummary) => {
        setIsFactChecking(true);
        setFactCheckResult(null);
        try {
            const response = await fetch('http://localhost:5000/api/fact-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ korean_news_body: koreanSummary }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`유사 해외 기사 검색 실패: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            setFactCheckResult(data.fact_check_result);
        } catch (err) {
            setError(prevError => prevError ? `${prevError}\n${err.message}` : err.message);
        } finally {
            setIsFactChecking(false);
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

    const handleTranslateSummary = async () => {
        setIsTranslatingSummary(true);
        setTranslatedSummary('');
        try {
            const response = await fetch('http://localhost:5000/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: summary, target_language: targetLanguage }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`요약본 번역 실패: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            setTranslatedSummary(data.translated_text);
        } catch (err) {
            setError(prevError => prevError ? `${prevError}\n${err.message}` : err.message);
        } finally {
            setIsTranslatingSummary(false);
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

    const getPoliticalLabel = (text) => {
        if (text.includes('진보')) return '진보';
        if (text.includes('보수')) return '보수';
        if (text.includes('중립') || text.includes('중립')) return '중립';
        return '분석 불가';
    };

    const getPoliticalImage = (leaning) => {
        if (leaning.includes('진보')) return '/images/politics/liberal.png';
        if (leaning.includes('보수')) return '/images/politics/conservative.png';
        if (leaning.includes('중립') || leaning.includes('중립')) return '/images/politics/neutral.png';
        return '/images/unknown.png';
    };
    const getPoliticalColor = (leaning) => {
        switch (leaning) {
            case "진보":
                return "#3b82f6"; // 파랑
            case "보수":
                return "#ef4444"; // 빨강
            case "중립":
            default:
                return "#9ca3af"; // 회색 (Tailwind 기준)
        }
    };

    const getLanguageLabel = (langCode) => {
        switch (langCode) {
            case 'en': return '영어';
            case 'ko': return '한국어';
            case 'ja': return '일본어';
            case 'zh-CN': return '중국어 (간체)';
            default: return langCode;
        }
    };

    return (
        <div className="analyze-page">
            <h1 className="analyze-title">기사 분석 하기</h1>
            <div className="blue-box">
                <div className="blue-box-inner">
                    거짓이 의심되는 기사의 신뢰도를 확인해보세요
                </div>
            </div>
            <div className="search-bar-wrapper">
                <div className="A-search-bar">
                    <AiOutlineSearch className="A-search-icon" />
                    <input
                        type="text"
                        id="articleLink"
                        value={articleLink}
                        onChange={(e) => setArticleLink(e.target.value)}
                        placeholder="뉴스 링크를 입력하세요"
                    />
                    <button onClick={handleFetchArticle} disabled={isFetchingArticle || isSummarizing || isAnalyzingPoliticalLeaning || isDetectingSource || isFactChecking || isTranslatingSummary}>
                        기사 본문 가져오기
                    </button>
                </div>
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
                    <div className="summary-button-wrapper">
                        <button className="summarize-button" onClick={handleSummarizeArticle} disabled={!articleBody || isSummarizing || isFetchingArticle || isAnalyzingPoliticalLeaning || isDetectingSource || isFactChecking || isTranslatingSummary}>
                            요약 하기
                        </button>
                    </div>
                    {isSummarizing && <p>요약중...</p>}
                    <div className="summary-section">
                        <h3>기사 요약</h3>
                        <textarea
                            value={summary}
                            rows="15"
                            cols="60" // 너비 조정
                            readOnly
                            style={{ height: '300px', overflowY: 'auto' }} // 높이 고정 및 스크롤 추가
                        />
                        {/* 요약본 번역 기능 추가 */}
                        <div className="translation-controls">
                            <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
                                <option value="en">영어</option>
                                <option value="ko">한국어</option>
                                <option value="ja">일본어</option>
                                <option value="zh-CN">중국어 (간체)</option>
                                <option value="uz-Cyrl-UZ">우즈베키스탄</option>
                                {/* 필요에 따라 다른 언어 옵션 추가 */}
                            </select>
                            <button className="trans-button" onClick={handleTranslateSummary} disabled={!summary || isTranslatingSummary}>
                                {isTranslatingSummary ? '번역 중...' : '요약본 번역'}
                            </button>
                        </div>
                        {translatedSummary && (
                            <div className="translated-section">
                                <h3>번역된 요약 ({getLanguageLabel(targetLanguage)})</h3>
                                <textarea
                                    value={translatedSummary}
                                    rows="15"
                                    cols="60" // 너비 조정
                                    readOnly
                                    style={{ height: '300px', overflowY: 'auto' }} // 높이 고정 및 스크롤 추가
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
            {riskLevelInfo && (
                <div className="risk-political-wrapper">
                    {/* 왼쪽: 위험도 */}
                    <div className="risk-box"
                        style={{
                            borderLeft: `6px solid ${getRiskColor(riskLevelInfo.risk_level)}`,
                        }}
                    >
                        <h3>기자 위험도 분석</h3>
                        <p>
                            기자: {riskLevelInfo.reporter_name} <br />
                            위험도: {getRiskLevelText(riskLevelInfo.risk_level)} ({riskLevelInfo.mention_count_in_table}번 언급)
                        </p>
                        {getRiskLevelImage(riskLevelInfo.risk_level) && (
                            <img
                                src={getRiskLevelImage(riskLevelInfo.risk_level)}
                                alt={riskLevelInfo.risk_level}
                                className="risk-gauge-image"
                            />
                        )}
                    </div>

                    {/* 오른쪽: 정치 성향 요약 */}
                    {politicalLeaning && (
                        <div className="political-box"
                            style={{
                                borderRight: `6px solid ${getPoliticalColor(getPoliticalLabel(politicalLeaning))}`
                            }}
                        >
                            <h3>기사의 정치 성향</h3>
                            <p className="leaning-label">{getPoliticalLabel(politicalLeaning)}</p>
                            <img
                                src={getPoliticalImage(politicalLeaning)}
                                alt={getPoliticalLabel(politicalLeaning)}
                                className="leaning-image"
                            />
                        </div>
                    )}
                </div>
            )}

            {politicalLeaning && (
                <div className="political-leaning-section">
                    <h3>정치적 성향 분석</h3>
                    <p>{politicalLeaning}</p>
                </div>
            )}
            {isAnalyzingPoliticalLeaning && <p>기사의 정치적 성향을 분석 중입니다...</p>}

            {sourceInfo && (
                <div className="source-section">
                    <h3>출처 정보</h3>
                    <p>{sourceInfo}</p>
                </div>
            )}
            {isDetectingSource && <p>기사에서 출처 정보를 확인하는 중입니다...</p>}



            {/* 유사 해외 기사 검색 결과 표시 */}
            {isFactChecking && <p>유사한 해외 기사를 검색 중입니다...</p>}
            {factCheckResult && (
                <div className="fact-check-section">
                    <h3>유사한 해외 기사</h3>
                    {typeof factCheckResult === 'string' ? (
                        <p>{factCheckResult}</p>
                    ) : (
                        factCheckResult.articles && factCheckResult.articles.length > 0 ? (
                            <ul>
                                {factCheckResult.articles.map((article, index) => (
                                    <li key={index}>
                                        <a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>유사한 해외 기사를 찾지 못했습니다.</p>
                        )
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