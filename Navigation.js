import React from 'react';
import './Navigation.css';

function Navigation({ onCategorySelect, selectedCategory }) {
  const categories = ['전체', '경제', '사회', '정치', 'IT과학'];

  return (
    <nav className="news-navigation">
      {categories.map((category, index) => {
        const isActive = selectedCategory === (category === '전체' ? '' : category);
        return (
          <button
            key={index}
            onClick={() => onCategorySelect(category === '전체' ? '' : category)}
            className={`category-button ${isActive ? 'active' : ''}`}
          >
            {category}
          </button>
        );
      })}
    </nav>
  );
}

export default Navigation;
