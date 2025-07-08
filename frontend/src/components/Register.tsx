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