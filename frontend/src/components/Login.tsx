import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from '../Path';
import { storeToken } from '../tokenStorage';
import { jwtDecode } from 'jwt-decode';

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
      setModalMessage("Password Must be at least 8 characters");
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



  return (
    <div id="loginDiv">
      <span id="inner-title">PLEASE LOG IN</span><br />
      <form onSubmit={doLogin}>
        Login: <input
          type="text"
          id="loginName"
          placeholder="Username"
          value={loginName}
          onChange={handleSetLoginName}
        /><br />
        Password: <input
          type="password"
          id="loginPassword"
          placeholder="Password"
          value={loginPassword}
          onChange={handleSetPassword}
        />
        <br />
        <input
          type="submit"
          id="loginButton"
          className="buttons"
          value="Log in"
        />
      </form>
      <span id="loginResult">{message}</span>
      <input
        type="button"
        id="registerButton"
        className="buttons"
        value="Register"
        onClick={handleRegister}
      />
      <br />
      <input
        type="button"
        id="forgotButton"
        className="buttons"
        value="Forgot Password?"
        onClick={handleOpenModal}
      />
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            {modalStep === 'enterEmail' ? (
              <>
                <h2>Reset Password</h2>
                <p>Enter your email address to receive a password reset code.</p>
                <form onSubmit={handleSendVerificationCode}>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                  <div className="modal-actions">
                    <button type="submit" className="buttons">Send Code</button>
                    <button type="button" className="buttons" onClick={handleCloseModal}>Close</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2>Enter Verification Code</h2>
                <p>Check your email for the code we sent to {resetEmail}.</p>
                <form onSubmit={handleVerifyAndReset}>
                  <input
                    type="text"
                    placeholder="Verification Code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <div className="modal-actions">
                    <button type="submit" className="buttons">Reset Password</button>
                    <button type="button" className="buttons" onClick={handleCloseModal}>Close</button>
                  </div>
                </form>
              </>
            )}
            {modalMessage && <span className="modal-message">{modalMessage}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;