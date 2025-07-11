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

  // Helper functions for input changes remain the same
  function handleSetLoginName(e: React.ChangeEvent<HTMLInputElement>): void {
    setLoginName(e.target.value);
  }

  function handleSetPassword(e: React.ChangeEvent<HTMLInputElement>): void {
    setPassword(e.target.value);
  }

  const handleForgotPassword = () => {
    navigate('/forgot-password');
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
        onClick={handleForgotPassword}
      />

    </div>
  );
}

export default Login;