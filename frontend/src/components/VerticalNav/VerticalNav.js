// /Users/rk/Documents/Projects/conv-analytics-demo/frontend/src/components/VerticalNav/VerticalNav.js
// NOTE: The user provided the wrong file path in the prompt. This change is for ChatInterface.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faDatabase, faSitemap } from '@fortawesome/free-solid-svg-icons';

function VerticalNav() {
  return (
    <nav className="vertical-nav">
      <ul>
        <li>
          <NavLink to="/chat" className={({ isActive }) => (isActive ? 'active-link' : '')}>
            <FontAwesomeIcon icon={faComments} className="nav-icon" />
            <span>DataWise Agent Chat</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/data-preview" className={({ isActive }) => (isActive ? 'active-link' : '')}>
            <FontAwesomeIcon icon={faDatabase} className="nav-icon" />
            <span>BQ Dataset Preview</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/solution-architecture" className={({ isActive }) => (isActive ? 'active-link' : '')}>
            <FontAwesomeIcon icon={faSitemap} className="nav-icon" />
            <span>Solution Design</span>
          </NavLink>
        </li>
      </ul>

      <div className="nav-info-card">
        <h4>About this Demo</h4>
        <ul>
          <li>Powered by GCP APAC Solutions Acceleration.</li>
          <li>Powered by Google Gemin, Natural Language to SQL and  Built with React & Python</li>
          <li>Explore the sample questions at the bottom of the chat interface</li>
          <li>The dataset preview will take a few seconds to load, because it's querying the dataset to populate Schema information</li>
          <li>The Solution Design page shows you the key code files and how they work. Feel free to explore the repo on GitHub.</li>
        </ul>
        <a href="https://github.com/thecloudside/conv-analytics-demo" target="_blank" rel="noopener noreferrer" className="info-card-link">
          Explore on GitHub
        </a>
      </div>
    </nav>
  );
}

export default VerticalNav;
