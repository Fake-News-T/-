// components/RankingComment.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // useNavigate 훅 import
import './RankingComment.css';
import { FaThumbsUp, FaThumbsDown } from 'react-icons/fa';

function RankingComment({ selectedArticle, isLoggedIn, loggedInUsername, onBack }) {
    const navigate = useNavigate(); // useNavigate 훅 사용
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [error, setError] = useState('');
    const [replyTo, setReplyTo] = useState(null); // 현재 어떤 댓글에 답글 다는지
    const [editingCommentId, setEditingCommentId] = useState(null); // 수정 중인 댓글 ID
    const [editContent, setEditContent] = useState(''); // 수정할 내용
    const [voteCounts, setVoteCounts] = useState({}); // 🔹 댓글별 추천/비추천 수 저장
    const [votedComments, setVotedComments] = useState([]); // 🔹 사용자가 이미 투표한 댓글 ID 목록
    const [votesLoaded, setVotesLoaded] = useState(false);

    // 댓글 불러오기
    useEffect(() => {
        if (selectedArticle?.article_link) {
            fetch(`http://localhost:5000/api/comments?article_link=${selectedArticle.article_link}`)
                .then(res => res.json())
                .then(data => {
                    setComments(data.comments || []);
                    const fetchVotes = async () => {
                        const allCounts = {};
                        for (const comment of data.comments) {
                            const res = await fetch(`http://localhost:5000/api/comments/vote-counts?comment_id=${comment.id}`);
                            const result = await res.json();
                            allCounts[comment.id] = result.counts;
                        }
                        setVoteCounts(allCounts);
                        setVotesLoaded(true); // ✅ 이 줄 추가
                    };
                    fetchVotes();
                })
                .catch(err => console.error(err));
        }
    }, [selectedArticle]);

    // 댓글 또는 답글 작성
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const response = await fetch('http://localhost:5000/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    article_link: selectedArticle.article_link,
                    username: loggedInUsername,
                    content: newComment,
                    parent_id: replyTo,
                }),
            });

            if (!response.ok) throw new Error('댓글 작성 실패');

            // 댓글 새로고침
            const refreshed = await fetch(`http://localhost:5000/api/comments?article_link=${selectedArticle.article_link}`);
            const data = await refreshed.json();
            setComments(data.comments);

            setNewComment('');
            setReplyTo(null);
        } catch (err) {
            setError('댓글 작성에 실패했습니다.');
        }
    };

    // 답글 버튼 클릭 시
    const handleReplyClick = (parentId) => {
        setReplyTo(parentId);
        setNewComment('');
    };

    if (!selectedArticle) {
        return <p>선택된 뉴스가 없습니다.</p>;
    }

    //수정버튼 눌렀을때
    const handleEditClick = (comment) => {
        setEditingCommentId(comment.id);
        setEditContent(comment.content);
    };

    //댓글 수정
    const handleUpdateComment = async (e) => {
        e.preventDefault();
        if (!editContent.trim()) return;

        try {
            const response = await fetch(`http://localhost:5000/api/comments/${editingCommentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editContent }),
            });

            if (!response.ok) {
                throw new Error('수정 실패');
            }

            // 수정 반영
            setComments(prev =>
                prev.map(c =>
                    c.id === editingCommentId ? { ...c, content: editContent } : c
                )
            );
            setEditingCommentId(null);
            setEditContent('');
        } catch (err) {
            console.error(err);
            setError('댓글 수정에 실패했습니다.');
        }
    };

    //댓글 삭제
    const handleDeleteComment = async (commentId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('삭제 실패');
            }

            setComments(prev =>
                prev.map(c =>
                    c.id === commentId ? { ...c, content: '삭제된 댓글입니다.', is_deleted: true } : c
                )
            );
        } catch (err) {
            console.error(err);
            setError('댓글 삭제에 실패했습니다.');
        }
    };
    //추천/비추천 처리
    const handleVote = async (commentId, isUpvote) => {
        if (!isLoggedIn) {
            alert("로그인 후 이용 가능합니다.");
            return;
        }

        if (votedComments.includes(commentId)) {
            alert("이미 투표한 댓글입니다.");
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/comments/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comment_id: commentId,
                    username: loggedInUsername,
                    is_upvote: isUpvote
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            // 투표 후 실시간으로 최신 count 불러오기
            const voteRes = await fetch(`http://localhost:5000/api/comments/vote-counts?comment_id=${commentId}`);
            const voteData = await voteRes.json();

            setVoteCounts(prev => ({
                ...prev,
                [commentId]: voteData.counts
            }));

            setVotedComments(prev => [...prev, commentId]); // 이미 투표한 댓글로 등록
        } catch (err) {
            if (err.message.includes('409')) {
                // 중복 투표는 콘솔에 출력하지 않음
            } else {
                console.error(err);
            }
            alert(err.message || "투표에 실패했습니다.");
        }
    };

    const handleBackButtonClick = () => {
        navigate('/ranking'); // 랭킹 페이지로 이동
        onBack();             // App.js의 selectedArticle 상태를 null로 설정하는 함수 호출
    };

    // 베스트 댓글 필터링 및 정렬 (최대 3개)
    // ✅ 더 안전한 방식: ID 기준으로 베스트 댓글 분리
const bestCommentIds = comments
.filter(c => !c.parent_id && (voteCounts[c.id]?.upvotes || 0) >= 3)
.sort((a, b) => (voteCounts[b.id]?.upvotes || 0) - (voteCounts[a.id]?.upvotes || 0))
.slice(0, 3)
.map(c => c.id);

const bestComments = comments.filter(c => bestCommentIds.includes(c.id));
const regularComments = comments.filter(c => !c.parent_id && !bestCommentIds.includes(c.id));


    return (
        <div className="ranking-comment-page">
            <button className="back-button" onClick={handleBackButtonClick}>← 뒤로가기</button>
            <div className="article-summary-box">
                <h2>{selectedArticle.title || '요약된 뉴스'}</h2> {/* 제목 표시 (없을 경우 대체 텍스트) */}

                <p>{selectedArticle.article_summary}</p>
                <a href={selectedArticle.article_link} target="_blank" rel="noopener noreferrer">원본 기사 보기</a>
            </div>

            <div className="comment-section">
                <h3>댓글</h3>
                {/* 일반 댓글 입력창 먼저! */}
                {replyTo === null && (
                    isLoggedIn ? (
                        <form onSubmit={handleSubmit} className="comment-form">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="타인에게 피해를 주거나 비속어를 사용하면 제재당할수 있습니다"
                            />
                            <button type="submit">등록</button>
                        </form>
                    ) : (
                        <div className="comment-login-required">
                            <p> 댓글을 작성하려면 로그인이 필요합니다.</p>
                        </div>
                    )
                )}
                {votesLoaded && bestComments.length > 0 && (
                    <div className="best-comments-section">
                        <h4>🔥 베스트 댓글</h4>
                        <ul className="best-comment-list">
                            {bestComments.map(comment => (
                            <li key={comment.id} className="best-comment-item">
                                <div className="comment-header">
                                    <div className="comment-meta">
                                        <span className="username">{comment.username}</span>
                                        <span className="separator"> | </span>
                                        <span>
                                            {new Date(new Date(comment.created_at).setHours(new Date(comment.created_at).getHours() - 9)).toLocaleString('ko-KR')}
                                        </span>
                                    </div>
                                    {isLoggedIn && comment.username === loggedInUsername && !comment.is_deleted && (
                                        <div className="comment-actions">
                                            <button onClick={() => handleEditClick(comment)}>수정</button>
                                            <button onClick={() => handleDeleteComment(comment.id)}>삭제</button>
                                        </div>
                                    )}
                                </div>

                                <p className="comment-content">{comment.content}</p>

                                <div className="comment-footer">
                                    <div className="left-side">
                                        {isLoggedIn && (
                                            <button onClick={() => handleReplyClick(comment.id)}>답글</button>
                                        )}
                                    </div>
                                    <div className="right-side vote-buttons">
                                        <button
                                            className={`vote-button recommend ${votedComments.includes(comment.id) ? 'voted' : ''}`}
                                            onClick={() => handleVote(comment.id, true)}
                                        >
                                            <FaThumbsUp className="vote-icon" />
                                            <span>{voteCounts[comment.id]?.upvotes || 0}</span>
                                        </button>
                                        <button
                                            className={`vote-button not-recommend ${votedComments.includes(comment.id) ? 'voted' : ''}`}
                                            onClick={() => handleVote(comment.id, false)}
                                        >
                                            <FaThumbsDown className="vote-icon" />
                                            <span>{voteCounts[comment.id]?.downvotes || 0}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* ✅ 대댓글 렌더링 */}
                                <ul className="reply-list">
                                    {comments
                                        .filter(c => c.parent_id === comment.id)
                                        .map(reply => (
                                            <li key={reply.id} className="reply-item">
                                                {/* ...기존 reply 렌더링 그대로 재사용 */}
                                                <div className="comment-header">
                                                    <div className="comment-meta">
                                                        <span className="username">{reply.username}</span>
                                                        <span className="separator"> | </span>
                                                        <span>{new Date(new Date(reply.created_at).setHours(new Date(reply.created_at).getHours() - 9)).toLocaleString('ko-KR')}</span>
                                                    </div>
                                                    {isLoggedIn && reply.username === loggedInUsername && !reply.is_deleted && (
                                                    <div className="comment-actions">
                                                        <button onClick={() => handleEditClick(reply)}>수정</button>
                                                        <button onClick={() => handleDeleteComment(reply.id)}>삭제</button>
                                                    </div>
                                                    )}
                                                </div>
                                                {editingCommentId === reply.id ? (
                                                    <form onSubmit={handleUpdateComment} className="edit-form">
                                                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                                                        <div className="button-group">
                                                            <button type="submit">수정</button>
                                                            <button type="button" onClick={() => setEditingCommentId(null)}>취소</button>
                                                        </div>
                                                    </form>
                                                    ) : (
                                                <>
                                                <p className="comment-content">
                                                {reply.is_deleted
                                                    ? (reply.deleted_by === 'admin' ? '관리자에 의해 삭제된 댓글입니다.' : '삭제된 댓글입니다.')
                                                    : reply.content}
                                                    </p>
                                                    <div className="comment-footer">
                                                        <div></div>
                                                        <div className="right-side vote-buttons">
                                                            <button
                                                                className={`vote-button recommend ${votedComments.includes(reply.id) ? 'voted' : ''}`}
                                                                onClick={() => handleVote(reply.id, true)}
                                                            >
                                                                <FaThumbsUp className="vote-icon" /><span>{voteCounts[reply.id]?.upvotes || 0}</span>
                                                            </button>
                                                            <button
                                                                className={`vote-button not-recommend ${votedComments.includes(reply.id) ? 'voted' : ''}`}
                                                                onClick={() => handleVote(reply.id, false)}
                                                            >
                                                                    <FaThumbsDown className="vote-icon" /><span>{voteCounts[reply.id]?.downvotes || 0}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                {/* ✅ 대댓글 입력창 */}
                                {isLoggedIn && replyTo === comment.id && (
                                    <form onSubmit={handleSubmit} className="reply-form">
                                        <textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="타인에게 피해를 주거나 비속어를 사용하면 제재당할수 있습니다"
                                        />
                                        <div className="button-group">
                                            <button type="submit">등록</button>
                                            <button type="button" onClick={() => setReplyTo(null)}>취소</button>
                                        </div>
                                    </form>
                                )}
                            </li>
                        ))}
                    </ul>
                    </div>
                )}

                <ul className="comment-list">
                    

                        {regularComments.map(comment => (
                            <li key={comment.id}>
                                {/* 상단 메타 + 수정/삭제 버튼을 한 줄에 배치 */}
                                <div className="comment-header">
                                    <div className="comment-meta">
                                        <span className="username">{comment.username}</span>
                                        <span className="separator"> | </span>
                                        <span>{new Date(new Date(comment.created_at).setHours(new Date(comment.created_at).getHours() - 9)).toLocaleString('ko-KR')}</span>
                                    </div>
                                    {/* 오른쪽 수정/삭제 버튼 */}
                                    {isLoggedIn && comment.username === loggedInUsername && !comment.is_deleted && (
                                        <div className="comment-actions">
                                            <button onClick={() => handleEditClick(comment)}>수정</button>
                                            <button onClick={() => handleDeleteComment(comment.id)}>삭제</button>
                                        </div>
                                    )}
                                </div>
                                {/* 댓글 내용 */}
                                {editingCommentId === comment.id ? (
                                    <form onSubmit={handleUpdateComment} className="edit-form">
                                        <textarea value={editContent}onChange={(e) => setEditContent(e.target.value)} />
                                        <div className="button-group">
                                            <button type="submit">수정</button>
                                            <button type="button" onClick={() => setEditingCommentId(null)}>취소</button>
                                        </div>

                                    </form>
                                ) : (
                                    <p className="comment-content">
                                        {comment.is_deleted
                                            ? (comment.deleted_by === 'admin' ? '관리자에 의해 삭제된 댓글입니다.' : '삭제된 댓글입니다.')
                                            : comment.content}
                                    </p>
                                )}

                                {/* 하단 버튼 영역 (왼쪽 답글 / 오른쪽 추천·비추천) */}
                                <div className="comment-footer">
                                    <div className="left-side">
                                        {isLoggedIn && (
                                            <button onClick={() => handleReplyClick(comment.id)}>답글</button>
                                        )}
                                    </div>
                                    <div className="right-side vote-buttons">
                                        <button className="vote-button recommend" onClick={() => handleVote(comment.id, true)}>
                                            <FaThumbsUp className="vote-icon" /> {voteCounts[comment.id]?.upvotes || 0}
                                        </button>
                                        <button className="vote-button not-recommend" onClick={() => handleVote(comment.id, false)}>
                                            <FaThumbsDown className="vote-icon" /> {voteCounts[comment.id]?.downvotes || 0}
                                        </button>
                                    </div>
                                </div>

                                {/* 대댓글 렌더링 */}
                                <ul className="reply-list">
                                    {comments
                                        .filter(c => c.parent_id === comment.id)
                                        .map(reply => (
                                            <li key={reply.id} className="reply-item">
                                                {/* 헤더 영역: 닉네임/날짜 + 수정/삭제 */}
                                                <div className="comment-header">
                                                    <div className="comment-meta">
                                                        <span className="username">{reply.username}</span>
                                                        <span className="separator"> | </span>
                                                        <span>{new Date(new Date(reply.created_at).setHours(new Date(comment.created_at).getHours() - 9)).toLocaleString('ko-KR')}</span>
                                                    </div>


                                                    {isLoggedIn && reply.username === loggedInUsername && !reply.is_deleted && (
                                                        <div className="comment-actions">
                                                            <button onClick={() => handleEditClick(reply)}>수정</button>
                                                            <button onClick={() => handleDeleteComment(reply.id)}>삭제</button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 수정 중이면 수정창, 아니면 내용 보여주기 */}
                                                {editingCommentId === reply.id ? (
                                                    <form onSubmit={handleUpdateComment} className="edit-form">
                                                        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                                                        <div className="button-group">
                                                            <button type="submit">수정</button>
                                                            <button type="button" onClick={() => setEditingCommentId(null)}>취소</button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <>
                                                        <p className="comment-content">
                                                            {reply.is_deleted
                                                                ? (reply.deleted_by === 'admin' ? '관리자에 의해 삭제된 댓글입니다.' : '삭제된 댓글입니다.')
                                                                : reply.content}
                                                        </p>

                                                        {/* 추천/비추천 버튼 */}
                                                        <div className="comment-footer">
                                                            <div></div> {/* 좌측 여백용 (답글 버튼 없음) */}
                                                            <div className="right-side vote-buttons">
                                                                <button
                                                                    className={`vote-button recommend ${votedComments.includes(reply.id) ? 'voted' : ''}`}
                                                                    onClick={() => handleVote(reply.id, true)}
                                                                >
                                                                    <FaThumbsUp className="vote-icon" /><span>{voteCounts[reply.id]?.upvotes || 0}</span>
                                                                </button>
                                                                <button
                                                                    className={`vote-button not-recommend ${votedComments.includes(reply.id) ? 'voted' : ''}`}
                                                                    onClick={() => handleVote(reply.id, false)}
                                                                >
                                                                    <FaThumbsDown className="vote-icon" /><span>{voteCounts[reply.id]?.downvotes || 0}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </li>
                                    ))}
                                    
                                </ul>

                                {/* 대댓글 입력창 */}
                                {isLoggedIn && replyTo === comment.id && (
                                    <form onSubmit={handleSubmit} className="reply-form">
                                        <textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="타인에게 피해를 주거나 비속어를 사용하면 제재당할수 있습니다"
                                        />
                                        <button type="submit">등록</button>
                                        <button type="button" onClick={() => setReplyTo(null)}>취소</button>
                                    </form>
                                )}
                            </li>
                        ))}
                </ul>
                {error && <p className="error-message">{error}</p>}
            </div>
        </div>
    );
}

export default RankingComment;