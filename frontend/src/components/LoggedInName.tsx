import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { retrieveToken } from '../tokenStorage';
import styles from './LoggedInName.module.css';


interface DecodedToken {
  firstName: string;
  lastName: string;
}

function LoggedInName() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token = retrieveToken();
    if (token) {
      const decodedToken = jwtDecode<DecodedToken>(token);
      let displayName = decodedToken.firstName + " " + decodedToken.lastName
      setUserName(displayName);
    }
  }, []);

  function doLogout(event: any): void {
    event.preventDefault();

    localStorage.removeItem("user_data");
    window.location.href = '/';
  };

  return (
    <div className={styles.loggedInContainer}>
      <span className={styles.userName}>Welcome {userName}</span>
      <button
        type="button"
        className={styles.logoutButton}
        onClick={doLogout}
      >
        Log Out
      </button>
    </div>
  );
};

export default LoggedInName;