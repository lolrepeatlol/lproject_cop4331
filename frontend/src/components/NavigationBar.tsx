import React from 'react';
import styles from './NavigationBar.module.css';
import LoggedInName from './LoggedInName';
import { useLocation } from 'react-router-dom';

const DiscoverIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12H15M3 6H21M3 18H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LibraryIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 18V12M8 18V15M12 18V9M16 18V12M20 18V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AboutIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NavigationBar: React.FC = () => {
  const location = useLocation(); // 2. Get the location object
  const currentPath = location.pathname; // e.g., "/discover", "/sound"

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <div className={styles.navLeft}>
          <a className={styles.brand}>Boardy</a>
        </div>

        <div className={styles.navCenter}>
          <a href="/discover" className={`${styles.navItem} ${currentPath === '/discover' ? styles.active : ''}`}>
            <DiscoverIcon />
            <span>Discover</span>
          </a>
          <a href="/sound" className={`${styles.navItem} ${currentPath === '/sound' ? styles.active : ''}`}>
            <LibraryIcon />
            <span>Library</span>
          </a>
          <a href="https://github.com/lolrepeatlol/lproject_cop4331" className={styles.navItem} target="_blank" rel="noopener noreferrer">
            <AboutIcon />
            <span>About</span>
          </a>
        </div>

        <div className={styles.navRight}>
          <LoggedInName />
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;