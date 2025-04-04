// components/SideMenu.js
import React from 'react';
import './SideMenu.css';
import { FaHome, FaChartBar, FaTrophy, FaPlus } from 'react-icons/fa'; //  아이콘 불러오기

function SideMenu({ isOpen, onClose, onNavigate }) {
    return (
        <div className={`side-menu ${isOpen ? 'open' : ''}`}>
            {/* 햄버거 버튼 추가 (사이드 메뉴 내부에서 닫기용) */}
            <button className="hamburger-menu in-side-menu" onClick={onClose}>☰</button>
            
            {/* X 버튼 추가 (기존 닫기용) */}
            <button className="close-button" onClick={onClose}>&times;</button>

            <ul className="menu-list">
                {/*  MAIN 카테고리 그룹 시작 */}
                <div className="menu-group">
                    <div className="menu-group-title">MAIN</div> {/*  그룹 타이틀 추가 */}

                    <li className="menu-item" onClick={() => onNavigate('news')} style={{ cursor: 'pointer' }}>
                        <FaHome className="menu-icon" /> {/* HOME 아이콘 */}
                        <span>HOME</span>
                    </li>

                    <li className="menu-item" onClick={() => onNavigate('analyze')} style={{ cursor: 'pointer' }}>
                        <FaChartBar className="menu-icon" /> {/* 분석 아이콘 */}
                        <span>분석하기</span>
                    </li>

                    <li className="menu-item" onClick={() => onNavigate('ranking')} style={{ cursor: 'pointer' }}>
                        <FaTrophy className="menu-icon" /> {/* 랭킹 아이콘 */}
                        <span>랭킹</span>
                    </li>
                </div>
                {/*  MAIN 카테고리 그룹 끝 */}

                {/*  OTHERS 카테고리 그룹 시작 */}
                <div className="menu-group">
                    <div className="menu-group-title">OTHERS</div> {/*  그룹 타이틀 추가 */}

                    <li className="menu-item">
                        <FaPlus className="menu-icon" /> {/* 추가 아이콘 */}
                        <span>더 추가할지도?</span>
                    </li>
                </div>
                {/*  OTHERS 카테고리 그룹 끝 */}
            </ul>
        </div>
    );
}

export default SideMenu;
