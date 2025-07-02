import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from '../Path';
import { storeToken } from '../tokenStorage';
import { jwtDecode } from 'jwt-decode';

// This interface expects the same token structure as login
interface DecodedToken {
  UserID: number;
  firstName: string;
  lastName: string;
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
    if (!firstName || !lastName || !email || !loginName || !loginPassword) {
      setMessage('All fields are required!');
      return; 
    }

    // Consolidate user data for the request
    const obj = { firstName, lastName, login: loginName, password: loginPassword };
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
        storeToken(res); // Store the token
        const decoded = jwtDecode<DecodedToken>(accessToken);

        const user = { firstName: decoded.firstName, lastName: decoded.lastName, id: decoded.UserID };
        localStorage.setItem('user_data', JSON.stringify(user));

        setMessage('Registration successful!');
        window.location.href = '/cards'; // Redirect to the main app page
      } else {
        // Fallback if the server response is unexpected
        setMessage('Registration successful, please log in.');
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


  return (
    <div id="registerDiv">
      <span id="inner-title">PLEASE REGISTER</span><br />
      <form onSubmit={doRegister}>
        First Name:
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={handleSetFirstName}
        /><br />
        Last Name:
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={handleSetLastName}
        /><br />
        Email:
        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={handleSetEmail}
        /><br />
        Username:
        <input
          type="text"
          placeholder="Username"
          value={loginName}
          onChange={handleSetLoginName}
        /><br />
        Password:
        <input
          type="password"
          placeholder="Password"
          value={loginPassword}
          onChange={handleSetPassword}
        />
        <br />
        <input
          type="submit"
          id="registerButton"
          className="buttons"
          value="Sign Up"
        />
        <br />
        <input
          type="button"
          id="backButton"
          className="buttons"
          value="Back to Login"
          onClick={gotoLogin}
        />
      </form>
      <span id="registerResult">{message}</span>
    </div>
  );
}

export default Register;