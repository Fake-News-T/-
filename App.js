import React, { useState } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import MainContent from './components/MainContent';
import SearchBar from './components/SearchBar';
import SideMenu from './components/SideMenu';
import Login from './components/Login';
import Signup from './components/Signup';
import AnalyzePage from './components/AnalyzePage'; // AnalyzePage 컴포넌트 import
import RankingPage from './components/RankingPage'; // RankingPage 컴포넌트 import
import './App.css';

function App() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
    const [loggedInUsername, setLoggedInUsername] = useState(null);
    const [currentPage, setCurrentPage] = useState('news'); // 현재 보여줄 페이지 상태 관리
    // const [page, setPage] = useState(1);

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
        console.log(`App.js - User logged in successfully! Username: ${username}`); // 추가된 로그
    };

    const handleLogout = () => {
        setLoggedInUsername(null);
        console.log('User logged out.');
    };

    const navigatePage = (page) => {
        setCurrentPage(page);
        setIsMenuOpen(false); // 페이지 이동 후 사이드 메뉴 닫기
    };

    const resetSearchAndCategory = () => {
        setSearchTerm('');
        setSelectedCategory(''); // 메인로고 누를시 메인 화면 이동
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
                <SideMenu isOpen={isMenuOpen} onClose={closeMenu} onNavigate={navigatePage} /> {/* onNavigate 함수를 SideMenu에 전달 */}
                <Navigation onCategorySelect={handleCategorySelect} selectedCategory={selectedCategory} />
            </div>
            {currentPage === 'news' && <SearchBar onSearch={handleSearch} />}
            {(() => {
                if (currentPage === 'news') {
                    return <MainContent searchTerm={searchTerm} selectedCategory={selectedCategory} />;// 현재 페이지 전달, 페이지 변경 함수 전달 추가
                } else if (currentPage === 'analyze') {
                    return <AnalyzePage isLoggedIn={!!loggedInUsername} loggedInUsername={loggedInUsername} />;
                } else if (currentPage === 'ranking') {
                    return <RankingPage />;
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