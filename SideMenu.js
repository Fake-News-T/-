// components/SideMenu.js
import React from 'react';
import './SideMenu.css';
import { Link } from 'react-router-dom'; // Link 컴포넌트 import
import { FaHome, FaChartBar, FaTrophy, FaUser } from 'react-icons/fa'; // 아이콘 불러오기

function SideMenu({ isOpen, onClose, isLoggedIn, loggedInUsername }) {
    return (
        <div className={`side-menu ${isOpen ? 'open' : ''}`}>
            <div className="side-menu-header">
            <h2 style={{ color: '#6b90ac', fontWeight: 'bold', fontSize: '28px' }}>메뉴 선택</h2>

                <button className="hamburger-menu in-side-menu" onClick={onClose}>☰</button>
            </div>
            {/* 햄버거 버튼 추가 (사이드 메뉴 내부에서 닫기용) */}
            {/*<button className="hamburger-menu in-side-menu" onClick={onClose}>☰</button>*/}

            {/* X 버튼 추가 (기존 닫기용) */}
            {/*<button className="close-button" onClick={onClose}>&times;</button>*/}

            {/* ✅ 전체 메뉴를 감싸는 flex column 컨테이너 */}
            <div className="menu-content">
                <ul className="menu-list">
                    {/* MAIN 카테고리 그룹 시작 */}
                    <div className="menu-group">
                        <div className="menu-group-title">MAIN</div> {/* 그룹 타이틀 추가 */}

                        <li className="menu-item">
                            <Link to="/" className="menu-link" onClick={onClose} style={{ cursor: 'pointer' }}>
                                <div className="menu-title">
                                    <FaHome className="menu-icon" /> {/* HOME 아이콘 */}
                                    <span>HOME</span>
                                </div>
                            </Link>
                        </li>

                        {/* 분석하기 */}
                        <li className="menu-item">
                            <Link to="/analyze" className="menu-link" onClick={onClose} style={{ cursor: 'pointer' }}>
                                <div className="menu-title">
                                    <FaChartBar className="menu-icon" />
                                    <span>분석하기</span>
                                </div>
                                <hr className="submenu-divider" />
                                <p className="menu-subtitle">기사의 신뢰도를 확인해보세요</p>
                            </Link>
                        </li>

                        {/* 랭킹 */}
                        <li className="menu-item">
                            <Link to="/ranking" className="menu-link" onClick={onClose} style={{ cursor: 'pointer' }}>
                                <div className="menu-title">
                                    <FaTrophy className="menu-icon" />
                                    <span>랭킹</span>
                                </div>
                                <hr className="submenu-divider" />
                                <p className="menu-subtitle">다른 사람이 추천한 기사들을 확인해보세요</p>
                            </Link>
                        </li>
                    </div>
                    {/* MAIN 카테고리 그룹 끝 */}

                    {/* 아마 여기부분 안쓸듯?*/}
                    {/* OTHERS 카테고리 그룹 시작 */}
                    {/*<div className="menu-group">
                        <div className="menu-group-title">OTHERS</div>  그룹 타이틀 추가 */}

                        {/*<li className="menu-item">
                            <FaPlus className="menu-icon" />  추가 아이콘 */}
                            {/*<span>더 추가할지도?</span>
                        </li>
                    </div>
                     OTHERS 카테고리 그룹 끝 */}
                </ul>
                {/* ✅ 어드민 전용 메뉴 (admin 계정만 표시) */}
                {loggedInUsername === 'admin' && (
                    <div className="menu-admin">
                        <li className="menu-item">
                            <Link to="/admin" className="menu-link" onClick={onClose} style={{ cursor: 'pointer' }}>
                                <div className="menu-title">
                                    <FaUser className="menu-icon" />
                                    <span>관리자 페이지</span>
                                </div>
                                <hr className="submenu-divider" />
                                <p className="menu-subtitle">댓글, 사용자, 기사 관리</p>
                            </Link>
                        </li>
                    </div>
                )}
                {/* ✅ 맨 아래 마이페이지 (로그인 상태일 때만 표시) */}
                {isLoggedIn && (
                    <div className="menu-mypage">
                        
                        <li className="menu-item">
                            <Link to="/mypage" className="menu-link" onClick={onClose} style={{ cursor: 'pointer' }}>
                                <div className="menu-title">
                                    <FaUser className="menu-icon" />
                                    <span>MyPage</span>
                                </div>
                                <hr className="submenu-divider" />
                                <p className="menu-subtitle">내 활동을 확인해보세요</p>
                            </Link>
                        </li>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SideMenu;