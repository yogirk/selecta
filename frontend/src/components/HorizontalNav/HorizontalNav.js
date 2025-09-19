import React from 'react';
import { Link } from 'react-router-dom';
import appLogo from '../../assets/logo.png'; // Assuming your logo is named logo.png

function HorizontalNav() {
  return (
    <nav className="horizontal-nav">
      <div className="nav-left">
        <Link to="/" className="app-info-link">
          <div className="app-info">
            <img src={appLogo} alt="DataWise Logo" className="app-logo" />
            <span className="app-title">DataWise</span>
          </div>
        </Link>
      </div>
      <div className="nav-right">
        <ul className="nav-links">
          <li>
            <a href="https://thecloudside.com/" target="_blank" rel="noopener noreferrer">
              Cloudside
            </a>
          </li>
          <li>
            <a href="https://blog.thecloudside.com/" target="_blank" rel="noopener noreferrer">
              Blog
            </a>
          </li>
          <li>
            <a href="https://thecloudside.com/contactus" target="_blank" rel="noopener noreferrer">
              Contact Us
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default HorizontalNav;