import React, { useEffect, useState } from 'react';
import './AdminPage.css';

function AdminPage({ loggedInUsername }) {
    const [users, setUsers] = useState([]);
    const [comments, setComments] = useState([]);
    const [articles, setArticles] = useState([]);
    const [userCount, setUserCount] = useState(0);
    const [deletedComments, setDeletedComments] = useState([]);
    const [activeTab, setActiveTab] = useState('comments'); // 초기값은 댓글 관련
    const [currentArticlePage, setCurrentArticlePage] = useState(1);
    const articlesPerPage = 20;
    const [showPageInput, setShowPageInput] = useState(false);
    const [jumpPage, setJumpPage] = useState('');
    const [showInputAt, setShowInputAt] = useState(null); // 'prev' 또는 'next'
    const [searchTerm, setSearchTerm] = useState('');

    

    // 현재 페이지 기사 추출
    const indexOfLastArticle = currentArticlePage * articlesPerPage;
    const indexOfFirstArticle = indexOfLastArticle - articlesPerPage;
    const currentArticles = articles.slice(indexOfFirstArticle, indexOfLastArticle);

    const totalArticlePages = Math.ceil(articles.length / articlesPerPage);

    useEffect(() => {
        fetch('http://localhost:5000/api/admin/users')
            .then(res => res.json())
            .then(data => setUsers(data));

        fetch('http://localhost:5000/api/admin/comments')
            .then(res => res.json())
            .then(data => setComments(data));

        fetch('http://localhost:5000/api/admin/articles')
            .then(res => res.json())
            .then(data => setArticles(data));

        fetch('http://localhost:5000/api/admin/user-count')
            .then(res => res.json())
            .then(data => setUserCount(data.count));

        fetch('http://localhost:5000/api/admin/deleted-comments')
            .then(res => res.json())
            .then(data => setDeletedComments(data.deleted_comments));
    }, []);
  
    const handleDeleteUser = (id) => {
        if (window.confirm("정말 삭제하시겠습니까?")) {
            fetch(`http://localhost:5000/api/admin/users/${id}`, { method: 'DELETE' })
                .then(() => setUsers(users.filter(u => u.id !== id)));
            }
        };
  
    const handleDeleteComment = (id) => {
        fetch(`http://localhost:5000/api/admin/comments/${id}`, { method: 'DELETE' })
            .then(() => {
                // 현재 comments 상태에서 삭제
                setComments(comments.filter(c => c.id !== id));
                
            // 삭제된 댓글 목록도 새로 fetch
            fetch('http://localhost:5000/api/admin/deleted-comments')
                .then(res => res.json())
                .then(data => setDeletedComments(data.deleted_comments));
            });
        };

    const handleDeleteArticle = (id) => {
        fetch(`http://localhost:5000/api/admin/articles/${id}`, { method: 'DELETE' })
            .then(() => setArticles(articles.filter(a => a.id !== id)));
            };

    const getPageRange = () => {
        const pages = [];
        const start = Math.max(1, currentArticlePage - 2);
        const end = Math.min(totalArticlePages, currentArticlePage + 2);

        if (start > 1) pages.push('prevDots');
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        if (end < totalArticlePages) pages.push('nextDots');

        return pages;
    };
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        return (
            <div className="admin-page">
                <div className="admin-header-wrapper">
                    <h1 className="admin-title">관리자 페이지</h1>
                    <div className="admin-subheader">❗ 관리자만 접근 가능한 페이지입니다. 로그인 후 이용해 주세요.</div>
                </div>
            </div>
        );
    }       
    
    return (
        <div className="admin-page">
            <div className="admin-header-wrapper">
                <h1 className="admin-title">관리자 페이지</h1>
            <div className="admin-subheader"> 다양한 관리 기능을 수행할 수 있어요.</div>
        </div>
        <p>👤 총 회원 수: {userCount}명</p>
        <div className="admin-tabs">
            <button onClick={() => setActiveTab("comments")} className={activeTab === "comments" ? "active" : ""}>💬 댓글 관련</button>
            <button onClick={() => setActiveTab("users")} className={activeTab === "users" ? "active" : ""}>👤 사용자 관련</button>
            <button onClick={() => setActiveTab("articles")} className={activeTab === "articles" ? "active" : ""}>📰 기사 관련</button>
        </div>

        {activeTab === "comments" && (
            <>
                <section className="admin-card">
                    <h2>🗨 댓글 관리</h2>
                    <ul>
                        {comments.map(comment => (
                            <li key={comment.id}>
                                {comment.content}
                                <button className="adminpage-delete-button" onClick={() => handleDeleteComment(comment.id)}>삭제</button>
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h2>🗑 삭제된 댓글</h2>
                    <ul>
                        {deletedComments.map(comment => (
                            <li key={comment.id}>
                                {comment.content} (작성자: {comment.username})
                            </li>
                        ))}
                    </ul>
                </section>
            </>
        )}

        {activeTab === "users" && (
            <section>
                <h2>👥 사용자 관리</h2>
                <ul>
                    {users.map(user => (
                        <li key={user.id}>
                            {user.username}
                            <button className="adminpage-delete-button" onClick={() => handleDeleteUser(user.id)}>삭제</button>
                        </li>
                    ))}
                </ul>
            </section>
        )}

        {activeTab === "articles" && (
            <section>
                <h2>📰 기사 관리</h2>
                <input
                    type="text"
                    placeholder="기사 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="article-search-input"
                />
                <ul>
                    {currentArticles.map(article => (
                        <li key={article.id}>
                            {article.title}
                            <button className="adminpage-delete-button" onClick={() => handleDeleteArticle(article.id)}>삭제</button>
                        </li>
                    ))}
                </ul>

                <div className="pagination">
                    {currentArticlePage > 1 && (
                        <>
                            <button onClick={() => setCurrentArticlePage(1)}>처음</button>
                            <button onClick={() => setCurrentArticlePage(prev => Math.max(1, prev - 1))}>이전</button>
                        </>
                    )}

                    {getPageRange().map((page, index) => {
                        if (page === 'prevDots') {
                            return showInputAt === 'prev' ? (
                                <input
                                    key="prevInput"
                                    type="number"
                                    className="page-input"
                                    min="1"
                                    max={totalArticlePages}
                                    autoFocus
                                    onBlur={() => setShowInputAt(null)}
                                    onChange={e => setJumpPage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const pageNum = parseInt(jumpPage);
                                        if (pageNum >= 1 && pageNum <= totalArticlePages) {
                                                setCurrentArticlePage(pageNum);
                                                setShowInputAt(null);
                                                setJumpPage('');
                                            }
                                        }
                                    }}
                                />
                            ) : (
                                <button key="prevDots" onClick={() => setShowInputAt('prev')}>...</button>
                            );
                        } else if (page === 'nextDots') {
                            return showInputAt === 'next' ? (
                                <input
                                key="nextInput"
                                type="number"
                                className="page-input"
                                min="1"
                                max={totalArticlePages}
                                autoFocus
                                onBlur={() => setShowInputAt(null)}
                                onChange={e => setJumpPage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const pageNum = parseInt(jumpPage);
                                    if (pageNum >= 1 && pageNum <= totalArticlePages) {
                                            setCurrentArticlePage(pageNum);
                                            setShowInputAt(null);
                                            setJumpPage('');
                                        }
                                    }
                                }}
                            />
                        ) : (
                            <button key="nextDots" onClick={() => setShowInputAt('next')}>...</button>
                        );
                    } else {
                        return (
                            <button
                                key={page}
                                onClick={() => setCurrentArticlePage(page)}
                                className={currentArticlePage === page ? 'active' : ''}
                            >
                                {page}
                            </button>
                        );
                    }
                })}

                    {currentArticlePage < totalArticlePages && (
                        <>
                            <button onClick={() => setCurrentArticlePage(prev => Math.min(totalArticlePages, prev + 1))}>다음</button>
                            <button onClick={() => setCurrentArticlePage(totalArticlePages)}>마지막</button>
                        </>
                    )}

                    {showPageInput && (
                        <div className="page-jump">
                            <input
                                type="number"
                                min="1"
                                max={totalArticlePages}
                                value={jumpPage}
                                onChange={e => setJumpPage(e.target.value)}
                                placeholder="이동할 페이지"
                            />
                            <button
                                onClick={() => {
                                const pageNum = parseInt(jumpPage);
                                    if (pageNum >= 1 && pageNum <= totalArticlePages) {
                                        setCurrentArticlePage(pageNum);
                                        setShowPageInput(false);
                                        setJumpPage('');
                                    }
                                }}
                            >
                                이동
                            </button>
                        </div>
                    )}
                </div>
            </section>
        )}
    </div>
    );
}

export default AdminPage;
