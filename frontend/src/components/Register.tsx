import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from '../Path';
import { storeToken } from '../tokenStorage';
import { jwtDecode } from 'jwt-decode';
import styles from './Register.module.css';

// This interface expects the same token structure as login
interface DecodedToken {
  UserID: number;
  firstName: string;
  lastName: string;
  email: string;
  isVerified: boolean;
}

function Register() {
  // State for form fields and messages
  const [message, setMessage] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setPassword] = useState('');
  const navigate = useNavigate();

  const gotoLogin = () => {
    navigate('/Login');
  };

  async function doRegister(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    // Check all feilds are entered
    let res: boolean = checkFields();
    if (res == false) {
      return;
    }
    // Consolidate user data for the request
    const obj = { firstName, lastName, login: loginName, password: loginPassword, email: email };
    const js = JSON.stringify(obj);

    try {
      const response = await fetch(buildPath('api/register'), {
        method: 'POST',
        body: js,
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await response.json();

      // Handle registration failure from the server
      if (!response.ok || res.error) {
        setMessage(res.error || 'An error occurred during registration.');
        return;
      }

      // Assuming the register endpoint returns a token upon success
      if (res.accessToken) {
        const { accessToken } = res;
        storeToken(res); 
        const decoded = jwtDecode<DecodedToken>(accessToken);

        const user = { firstName: decoded.firstName, lastName: decoded.lastName, email: decoded.email, isVerified: decoded.isVerified, id: decoded.UserID };
        localStorage.setItem('user_data', JSON.stringify(user));

        setMessage('Registration successful!');
        window.location.href = '/login'; // Redirect to the login app page
      } else {
        // Fallback if the server response is unexpected
        setMessage('Registration successful, please check your email for verification link.');
        await sleep(1500); // Wait 1.5 sec
        window.location.href = '/login'
      }

    } catch (error: any) {
      console.error("Registration failed:", error);
      setMessage('An error occurred during registration. Please try again.');
    }
  }

  // Helper functions to update state on input change
  function handleSetFirstName(e: React.ChangeEvent<HTMLInputElement>): void {
    setFirstName(e.target.value);
  }

  function handleSetLastName(e: React.ChangeEvent<HTMLInputElement>): void {
    setLastName(e.target.value);
  }

  function handleSetEmail(e: React.ChangeEvent<HTMLInputElement>): void {
    setEmail(e.target.value);
  }

  function handleSetLoginName(e: React.ChangeEvent<HTMLInputElement>): void {
    setLoginName(e.target.value);
  }

  function handleSetPassword(e: React.ChangeEvent<HTMLInputElement>): void {
    setPassword(e.target.value);
  }
  async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function checkFields(): boolean {
    if (!firstName || !lastName || !email || !loginName || !loginPassword) {
      setMessage('All fields are required!');
      return false;
    }
    if (!(email.includes('@') && email.includes('.com'))) {
      setMessage('Please make sure you are using a valid email IE: example@domain.com');
      return false;
    }
    if (loginPassword.length < 8) {
      setMessage('Password must be at least 8 characters!');
      return false;
    }
    let validKey = /[!@#$%^&*()?]/;
    if (!(validKey.test(loginPassword))) {
      console.log(validKey.test(loginPassword))
      setMessage('Password must contain a special character Ex.(!@$)')
      return false;
    }
    let upperCase = /[A-Z]/;
    if (!(upperCase.test(loginPassword))) {
      setMessage('Password must contain a captial letter');
      return false;
    }
    return true;
  }
   return (
    <div className={styles.registerPage}>
      <h1 className={styles.title}>Boardy</h1>
      <div className={styles.registerContainer}>
        <h1 className={styles.prompt}>Create Account</h1>
        <p className={styles.subtitle}>Join us! It only takes a minute.</p>
        <form onSubmit={doRegister} className={styles.registerForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="firstName">First Name</label>
            <input
              type="text"
              id="firstName"
              placeholder="Enter your first name"
              value={firstName}
              onChange={handleSetFirstName}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="lastName">Last Name</label>
            <input
              type="text"
              id="lastName"
              placeholder="Enter your last name"
              value={lastName}
              onChange={handleSetLastName}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={handleSetEmail}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="registerName">Username</label>
            <input
              type="text"
              id="registerName"
              placeholder="Choose a username"
              value={loginName}
              onChange={handleSetLoginName}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="registerPassword">Password</label>
            <input
              type="password"
              id="registerPassword"
              placeholder="Create a password"
              value={loginPassword}
              onChange={handleSetPassword}
            />
          </div>

          {message && <span className={styles.registerResult}>{message}</span>}

          <button type="submit" className={styles.primaryButton}>
            Sign Up
          </button>
        </form>
        <div className={styles.extraActions}>
          <button onClick={gotoLogin} className={styles.linkButton}>
            Already have an account? Log In
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;