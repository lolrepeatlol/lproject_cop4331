import { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { retrieveToken } from '../tokenStorage';
import { UserCircleGearIcon } from '@phosphor-icons/react';
import styles from './LoggedInName.module.css';

interface DecodedToken {
  firstName: string;
  lastName: string;
}

function LoggedInName() {
  const [userName, setUserName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = retrieveToken();
    if (token) {
      const decodedToken = jwtDecode<DecodedToken>(token);
      let displayName = decodedToken.firstName + " " + decodedToken.lastName;
      setUserName(displayName);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function doLogout(event: any): void {
    event.preventDefault();
    localStorage.removeItem("user_data");
    window.location.href = '/';
  }

  return (
      <div className={styles.loggedInContainer} ref={dropdownRef}>
        {/* Desktop: Icon with dropdown */}
        <div className={styles.desktopUserMenu}>
          <button
              className={styles.userIcon}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <UserCircleGearIcon size={24} />
          </button>

          {isDropdownOpen && (
              <div className={styles.dropdown}>
                <span className={styles.dropdownUserName}>Logged in as {userName}</span>
                <button
                    type="button"
                    className={styles.logoutButton}
                    onClick={doLogout}
                >
                  Log out
                </button>
              </div>
          )}
        </div>

        {/* Mobile: Original layout */}
        <div className={styles.mobileUserMenu}>
          <span className={styles.userName}>Logged in as {userName}</span>
          <button
              type="button"
              className={styles.logoutButton}
              onClick={doLogout}
          >
            Log out
          </button>
        </div>
      </div>
  );
}

export default LoggedInName;
