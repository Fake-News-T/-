import React, { useState, useEffect, useRef } from 'react';
import './SearchBar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

function SearchBar({ onSearch, loggedInUsername, isLoggedIn }) {
    const [term, setTerm] = useState('');
    const [recentSearches, setRecentSearches] = useState([]);
    const [isRecentSearchesVisible, setIsRecentSearchesVisible] = useState(false);
    const searchBarRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
        if (isLoggedIn && loggedInUsername) {
            const storedSearches = localStorage.getItem(`recentSearches-${loggedInUsername}`);
            if (storedSearches) {
                setRecentSearches(JSON.parse(storedSearches));
            }
        } else {
            setRecentSearches([]);
        }
    }, [isLoggedIn, loggedInUsername]);

    useEffect(() => {
        if (isLoggedIn && loggedInUsername && recentSearches.length > 0) {
            localStorage.setItem(`recentSearches-${loggedInUsername}`, JSON.stringify(recentSearches));
        }
    }, [recentSearches, isLoggedIn, loggedInUsername]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
                setIsRecentSearchesVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [searchBarRef]);

    const handleChange = (event) => {
        setTerm(event.target.value);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            onSearch(term);
            if (isLoggedIn && loggedInUsername) {
                const newRecentSearches = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
                setRecentSearches(newRecentSearches);
            }
            setTerm('');
            setIsRecentSearchesVisible(false);
        }
    };

    const handleRecentSearchClick = (recentTerm) => {
        setTerm(recentTerm);
        onSearch(recentTerm);
        setIsRecentSearchesVisible(false);
    };

    const handleClearAll = () => {
        setRecentSearches([]);
        localStorage.removeItem(`recentSearches-${loggedInUsername}`);
    };
    
    const handleRemove = (itemToRemove) => {
        const updated = recentSearches.filter(item => item !== itemToRemove);
        setRecentSearches(updated);
        localStorage.setItem(`recentSearches-${loggedInUsername}`, JSON.stringify(updated));
    };
    
    const getToday = () => {
        const today = new Date();
        return `${today.getMonth() + 1}.${today.getDate()}.`;
    };
    

    return (
        <div className="search-bar-container" ref={searchBarRef}>
            <div className="search-input-wrapper">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
                type="text"
                placeholder="뉴스 검색"
                value={term}
                onChange={handleChange}
                onFocus={() => setIsRecentSearchesVisible(true)}
                onKeyDown={handleKeyDown}
                ref={searchInputRef}
            />
            </div>

            {isLoggedIn && recentSearches.length > 0 && isRecentSearchesVisible && (
                <div className="recent-searches-float">
                {/* ⬇️ 상단 제목 + 전체삭제 버튼 */}
                <div className="recent-searches-header">
                    <span>최근검색어</span>
                        <button className="clear-all-btn" onClick={handleClearAll}>전체삭제</button>
                </div>

                    <ul className="recent-searches-list">
                        {recentSearches.map((item, index) => (
                        <li key={index} className="recent-item">
                            {/* 왼쪽: 시계 아이콘 + 텍스트 */}
                            <div className="left">
                                <span className="clock-icon">🕓</span>
                                <span className="search-text" onClick={() => handleRecentSearchClick(item)}>{item}</span>
                            </div>
                            {/* 오른쪽: 날짜 + 삭제 버튼 */}
                            <div className="right">
                                <span className="date">{getToday()}</span>
                                <button className="remove-btn" onClick={() => handleRemove(item)}>×</button>
                            </div>
                        </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default SearchBar;