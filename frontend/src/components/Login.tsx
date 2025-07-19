import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from '../Path';
import { storeToken } from '../tokenStorage';
import { jwtDecode } from 'jwt-decode';
import styles from './Login.module.css';

interface DecodedToken {
  UserID: number;
  firstName: string;
  lastName: string;
}

function Login() {
  const [message, setMessage] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setPassword] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const [modalStep, setModalStep] = useState('enterEmail');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');


  const navigate = useNavigate();
  const handleRegister = () => {
    navigate('/Register');
  };

  async function doLogin(event: React.FormEvent): Promise<void> {
    event.preventDefault();

    const obj = { login: loginName, password: loginPassword };
    const js = JSON.stringify(obj);

    try {
      const response = await fetch(buildPath('api/login'), {
        method: 'POST',
        body: js,
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await response.json();


      if (!response.ok || !res.accessToken) {
        // Handle cases where login fails on the server (e.g., wrong password)
        setMessage(res.error || 'User/Password combination incorrect');
        return;
      }

      const { accessToken } = res;
      storeToken(res); // Store the token

      const decoded = jwtDecode<DecodedToken>(accessToken);

      const { UserID, firstName, lastName } = decoded;

      if (UserID) {
        const user = { firstName, lastName, id: UserID };
        localStorage.setItem('user_data', JSON.stringify(user));

        setMessage('');
        window.location.href = '/sound'; // Redirect on success
      } else {
        // This case handles a malformed token that lacks a userId
        setMessage('An error occurred during login. Invalid token format.');
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      setMessage('An error occurred during login. Please try again.');
    }
  }

  function handleSetLoginName(e: React.ChangeEvent<HTMLInputElement>): void {
    setLoginName(e.target.value);
  }

  function handleSetPassword(e: React.ChangeEvent<HTMLInputElement>): void {
    setPassword(e.target.value);
  }


  const handleOpenModal = () => {
    setIsModalOpen(true);
    setMessage('');
    setModalMessage('');
    setModalStep('enterEmail');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setResetEmail('');
    setVerificationCode('');
    setNewPassword('');
    setModalMessage('');
  };

  const handleSendVerificationCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetEmail) {
      setModalMessage("Email Cannot Be blank");
      return;
    }
    setModalMessage('Sending reset link...');
    try {
      const response = await fetch(buildPath('api/forgotPassword'), {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok) {
        setModalMessage(data.message);
        setModalStep('enterCode');
      } else {
        setModalMessage(data.error || 'An unknown error occurred.');
      }

    } catch (error) {
      console.error('Password reset request failed:', error);
      setModalMessage('Could not connect to the server. Please try again later.');
    }
  };

  const handleVerifyAndReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setModalMessage("Password must be at least 8 characters");
      return;
    }

    let validKey = /[!@#$%^&*()?]/;
    if (!(validKey.test(newPassword))) {
      console.log(validKey.test(newPassword))
      setModalMessage('Password must contain a special character Ex.(!@$)')
      return;
    }

    let upperCase = /[A-Z]/;
    if (!(upperCase.test(newPassword))) {
      setModalMessage('Password must contain a captial letter');
      return;
    }
    setModalMessage('Verifying code and resetting password...');
    try {
      const payload = {
        email: resetEmail,
        passwordResetCode: verificationCode,
        newPassword: newPassword,
      };

      const response = await fetch(buildPath('api/resetPassword'), {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok) {
        setModalMessage("Password has been successfully reset! You can now close this window and log in.");
        setTimeout(() => {
          handleCloseModal();
        }, 1500);
      } else {
        setModalMessage(data.error || 'Invalid code or an error occurred.');
      }

    } catch (error) {
      console.error('Password verification failed:', error);
      setModalMessage('Could not connect to the server. Please try again later.');
    }
  };
const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
  if (e.target === e.currentTarget) {
    handleCloseModal();
  }
};



  return (
    <div className={styles.loginPage}>
      <h1 className={styles.title}>Boardy</h1>
      <div className={styles.loginContainer}>
        <h1 className={styles.prompt}>Welcome</h1>
        <p className={styles.subtitle}>Please log in to continue</p>
        <form onSubmit={doLogin} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="loginName">Username</label>
            <input
              type="text"
              id="loginName"
              placeholder="Enter your username"
              value={loginName}
              onChange={handleSetLoginName}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="loginPassword">Password</label>
            <input
              type="password"
              id="loginPassword"
              placeholder="Enter your password"
              value={loginPassword}
              onChange={handleSetPassword}
            />
          </div>
          {message && <span className={styles.loginResult}>{message}</span>}
          <button type="submit" className={styles.primaryButton}>
            Log In
          </button>
        </form>
        <div className={styles.extraActions}>
          <button onClick={handleOpenModal} className={styles.linkButton}>
            Forgot Password?
          </button>
          <button onClick={handleRegister} className={styles.linkButton}>
            Don't have an account? Sign Up
          </button>
        </div>
      </div>

      {isModalOpen && (
        // When this overlay is clicked, the modal will close
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
          <div className={styles.modalContent}>
            {/* New close button in the top-right corner */}
            <button className={styles.closeButton} onClick={handleCloseModal}>
              &times;
            </button>

            {modalStep === 'enterEmail' ? (
              <>
                <h2>Reset Password</h2>
                <label htmlFor="resetEmail" style={{ display: 'block', marginBottom: '1rem' }}>
                  Enter your email to receive a reset code.
                </label>
                <form onSubmit={handleSendVerificationCode}>
                  <input
                    id="resetEmail"
                    name="resetEmail"
                    type="email"
                    placeholder="your.email@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                  <div className={styles.modalActions}>
                    <button type="submit" className={styles.primaryButton}>Send Code</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2>Enter Verification Code</h2>
                <p>Check your email for the code sent to {resetEmail}.</p>
                <form onSubmit={handleVerifyAndReset}>
                  <label htmlFor="verificationCode" style={{ display: 'none' }}>Verification Code</label>
                  <input
                    id="verificationCode"
                    name="verificationCode"
                    type="text"
                    placeholder="Verification Code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                  <label htmlFor="newPassword" style={{ display: 'none' }}>New Password</label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <div className={styles.modalActions}>
                    <button type="submit" className={styles.primaryButton}>Reset Password</button>
                  </div>
                </form>
              </>
            )}
            {modalMessage && <span className={styles.modalMessage}>{modalMessage}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;