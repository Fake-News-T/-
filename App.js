import React, { useState } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import MainContent from './components/MainContent';
import SearchBar from './components/SearchBar';
import SideMenu from './components/SideMenu';
import Login from './components/Login';
import Signup from './components/Signup';
import AnalyzePage from './components/AnalyzePage';
import RankingPage from './components/RankingPage';
import RankingComment from './components/RankingComment'; // 🔹 댓글 페이지 추가
import './App.css';

function App() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
    const [loggedInUsername, setLoggedInUsername] = useState(null);
    const [currentPage, setCurrentPage] = useState('news');
    const [selectedArticle, setSelectedArticle] = useState(null); // 🔹 선택된 뉴스 저장

    const handleSearch = (term) => {
        setSearchTerm(term);
    };

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setSearchTerm('');
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const openLoginModal = () => {
        setIsLoginModalOpen(true);
    };

    const closeLoginModal = () => {
        setIsLoginModalOpen(false);
    };

    const openSignupModal = () => {
        setIsSignupModalOpen(true);
    };

    const closeSignupModal = () => {
        setIsSignupModalOpen(false);
    };

    const handleLoginSuccess = (username) => {
        setLoggedInUsername(username);
        console.log(`App.js - User logged in successfully! Username: ${username}`);
    };

    const handleLogout = () => {
        setLoggedInUsername(null);
        console.log('User logged out.');
    };

    const navigatePage = (page) => {
        setCurrentPage(page);
        setIsMenuOpen(false);
    };

    const resetSearchAndCategory = () => {
        setSearchTerm('');
        setSelectedCategory('');
    };

    const handleOpenCommentPage = (article) => {
        setSelectedArticle(article);
        setCurrentPage('comment');
    };

    const handleBackToRanking = () => {
        setCurrentPage('ranking');
        setSelectedArticle(null);
    };

    return (
        <div className="app">
            <div className="sticky-wrapper">
                <Header
                    onMenuToggle={toggleMenu}
                    onOpenLogin={openLoginModal}
                    onOpenSignup={openSignupModal}
                    loggedInUsername={loggedInUsername}
                    onLogout={handleLogout}
                    onNavigate={navigatePage}
                    onResetSearchAndCategory={resetSearchAndCategory}
                />
                <SideMenu isOpen={isMenuOpen} onClose={closeMenu} onNavigate={navigatePage} />
                {/* 구분선 추가*/}
                <div className="header-divider" />
                <Navigation onCategorySelect={handleCategorySelect} selectedCategory={selectedCategory} />
            </div>

            {currentPage === 'news' && <SearchBar onSearch={handleSearch} />}

            {(() => {
                if (currentPage === 'news') {
                    return <MainContent searchTerm={searchTerm} selectedCategory={selectedCategory} />;
                } else if (currentPage === 'analyze') {
                    return <AnalyzePage isLoggedIn={!!loggedInUsername} loggedInUsername={loggedInUsername} />;
                } else if (currentPage === 'ranking') {
                    return <RankingPage onArticleClick={handleOpenCommentPage} />;
                } else if (currentPage === 'comment') {
                    return (
                        <RankingComment
                            selectedArticle={selectedArticle}
                            isLoggedIn={!!loggedInUsername}
                            loggedInUsername={loggedInUsername}
                            onBack={handleBackToRanking}
                        />
                    );
                } else {
                    return null;
                }
            })()}

            {isLoginModalOpen && <Login onClose={closeLoginModal} onLoginSuccess={handleLoginSuccess} />}
            {isSignupModalOpen && <Signup onClose={closeSignupModal} />}
        </div>
    );
}

export default App;
