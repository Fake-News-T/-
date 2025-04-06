// import { Link } from 'react-router-dom';
import { FaUser, FaUserPlus, FaSignOutAlt } from 'react-icons/fa';
import React from 'react';
import './Header.css';

function Header({ onMenuToggle, onOpenLogin, onOpenSignup, loggedInUsername, onLogout, onNavigate, onResetSearchAndCategory }) {
    return (
        <header className="news-header">
            <div className="header-left">
                <button className="hamburger-menu" onClick={onMenuToggle}>☰</button>
            </div>
            <div className="header-center">
            <span className="news-logo" onClick={() => {
                onResetSearchAndCategory();   // 검색어 & 카테고리 초기화
                onNavigate('news');          // 메인 페이지로 이동
                window.scrollTo(0, 0);        // 스크롤 맨 위로
                }}
                style={{ cursor: 'pointer' }}
                >
                    신뢰도 판단기
                    </span>
            </div>
            <div className="header-right">
                {loggedInUsername ? (
                    <>
                        <span className="logged-in-user">{loggedInUsername}</span>
                        <button className="logout-button" onClick={onLogout}>
                            <FaSignOutAlt />로그아웃</button> 
                    </>     
                ) : (
                    <>
                        <button className="login-button" onClick={onOpenLogin}>
                            <FaUser />로그인</button>
                        <button className="signup-button" onClick={onOpenSignup}>
                            <FaUserPlus />회원가입</button>
                    </>
                )}
            </div>
        </header>
    );
}

export default Header;