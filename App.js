import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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
import MyPage from './components/mypage';
import AdminPage from './components/AdminPage';
import './App.css';

function App() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
    const [loggedInUsername, setLoggedInUsername] = useState(null);
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

    return (
        <Router>
            <div className="app">
                <div className="sticky-wrapper">
                    <Header
                        onMenuToggle={toggleMenu}
                        onOpenLogin={openLoginModal}
                        onOpenSignup={openSignupModal}
                        loggedInUsername={loggedInUsername}
                        onLogout={handleLogout}
                        onResetSearchAndCategory={() => {
                            setSearchTerm('');
                            setSelectedCategory('');
                        }}
                    />
                    <SideMenu isOpen={isMenuOpen} onClose={closeMenu} isLoggedIn={!!loggedInUsername} loggedInUsername={loggedInUsername} />
                    {/* 구분선 추가*/}
                    <div className="header-divider" />
                    <Navigation onCategorySelect={handleCategorySelect} selectedCategory={selectedCategory} />
                </div>

                <Routes>
                    <Route path="/" element={
                        <>
                            <SearchBar onSearch={handleSearch}isLoggedIn={!!loggedInUsername} loggedInUsername={loggedInUsername}/>
                            <MainContent searchTerm={searchTerm} selectedCategory={selectedCategory} isLoggedIn={!!loggedInUsername} loggedInUsername={loggedInUsername} />
                        </>
                    } />
                    <Route path="/analyze" element={<AnalyzePage isLoggedIn={!!loggedInUsername} loggedInUsername={loggedInUsername} />} />
                    <Route path="/ranking" element={<RankingPage onArticleClick={(article) => setSelectedArticle(article)} />} />
                    <Route path="/comment" element={<RankingComment selectedArticle={selectedArticle} isLoggedIn={!!loggedInUsername} loggedInUsername={loggedInUsername} onBack={() => setSelectedArticle(null)} />} />
                    <Route path="/mypage" element={<MyPage isLoggedIn={!!loggedInUsername} loggedInUsername={loggedInUsername} onLogout={handleLogout} />} /> {/* onLogout prop 전달 */}
                    <Route path="/admin" element={<AdminPage loggedInUsername={loggedInUsername} />} />
                </Routes>

                {isLoginModalOpen && <Login onClose={closeLoginModal} onLoginSuccess={handleLoginSuccess} />}
                {isSignupModalOpen && <Signup onClose={closeSignupModal} />}
            </div>
        </Router>
    );
}

export default App;