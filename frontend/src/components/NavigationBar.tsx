import React, { useState } from 'react';
import styles from './NavigationBar.module.css';
import LoggedInName from './LoggedInName';
import { useLocation } from 'react-router-dom';
import { ListMagnifyingGlassIcon, WaveformIcon, InfoIcon, XIcon, ListIcon } from '@phosphor-icons/react';

const NavigationBar: React.FC = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const closeMenu = () => setIsMenuOpen(false);

    const navLinks = (
        <>
            <a href="/discover" className={`${styles.navItem} ${currentPath === '/discover' ? styles.active : ''}`} onClick={closeMenu}>
                <ListMagnifyingGlassIcon size={24} />
                <span>Discover</span>
            </a>
            <a href="/sound" className={`${styles.navItem} ${currentPath === '/sound' ? styles.active : ''}`} onClick={closeMenu}>
                <WaveformIcon size={24} />
                <span>Library</span>
            </a>
            <a href="https://github.com/lolrepeatlol/lproject_cop4331" className={styles.navItem} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
                <InfoIcon size={24} />
                <span>About</span>
            </a>
        </>
    );

    return (
        <>
            <nav className={styles.navbar}>
                <div className={styles.navContent}>
                    <div className={styles.navLeft}>
                        <a className={styles.brand}>Boardy</a>
                    </div>
                    <div className={styles.navCenter}>
                        {navLinks}
                    </div>
                    <div className={styles.navRight}>
                        <LoggedInName />
                    </div>
                    <button className={styles.hamburger} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <XIcon size={24} /> : <ListIcon size={24} />}
                    </button>
                </div>
            </nav>
            <div className={`${styles.mobileNavMenu} ${isMenuOpen ? styles.open : ''}`}>
                {navLinks}
                <div className={styles.loggedInContainer}>
                    <LoggedInName />
                </div>
            </div>
        </>
    );
};

export default NavigationBar;