// components/SearchBar.js
import React, { useState } from 'react';
import './SearchBar.css'; // 필요하다면 스타일 파일 생성
import { AiOutlineSearch } from 'react-icons/ai'; // 돋보기 아이콘

function SearchBar({ onSearch }) {
    const [term, setTerm] = useState('');

    const handleChange = (event) => {
        setTerm(event.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onSearch(term);
    };

    return (
        <div className="search-bar">
            <form onSubmit={handleSubmit} className="search-form">
                <AiOutlineSearch className="search-icon" />
                <input
                    type="text"
                    placeholder="뉴스 검색"
                    value={term}
                    onChange={handleChange}
                />
                {/* 버튼 숨기고 싶으면 이거 제거하거나 hidden 처리 가능 */}
                {/* <button type="submit">검색</button> */}
            </form>
        </div>
    );
}

export default SearchBar;