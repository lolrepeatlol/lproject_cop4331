import React, { useState, useEffect, useRef } from 'react';
import styles from './SoundUI.module.css';
import { buildPath } from '../Path';
import { retrieveToken, storeToken } from '../tokenStorage';

// Define the structure of a sound object
interface Sound {
  _id: string;
  soundName: string;
  path: string;
  isDefault: boolean;
  UserID?: string;
}

function SoundUI() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGridItem, setSelectedGridItem] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<Sound[]>([]);
  const [gridSounds, setGridSounds] = useState<(Sound | null)[]>(Array(8).fill(null));
  const [isGridLoaded, setIsGridLoaded] = useState(false);
  useEffect(() => {
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundColor = '#1C1C1EB3';
    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUserID = (): string | null => {
    const userData = localStorage.getItem('user_data');
    if (!userData) {
      setMessage('User data not found. Please log in again.');
      return null;
    }
    const user = JSON.parse(userData);
    return user.id;
  };

  const handleUpload = async (fileToUpload: File) => {
    const UserID = getUserID();
    if (!UserID) {
      setUploadMessage('You must be logged in to upload a file.');
      return;
    }

    const formData = new FormData();
    formData.append('soundFile', fileToUpload);
    formData.append('UserID', UserID);
    formData.append('jwtToken', retrieveToken() || '');

    setUploadMessage(`Uploading "${fileToUpload.name}"...`);

    try {
      const response = await fetch(buildPath('api/uploadSound'), {
        method: 'POST',
        body: formData,
      });

      const res = await response.json();
      if (response.status !== 201) {
        setUploadMessage(`Error: ${res.error || 'Upload failed'}`);
      } else {
        setUploadMessage(`Success! "${res.newSound.soundName}" was uploaded.`);
        
        setTimeout(() => {
          setUploadMessage('');
        }, 3000);
        
        if (res.jwtToken) {
          storeToken(res.jwtToken);
        }
      }
    } catch (error: any) {
      setUploadMessage(`An error occurred: ${error.toString()}`);
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  // --- Function to get the grid layout from the API ---
  const fetchGridLayout = async () => {
    const UserID = getUserID();
    if (!UserID) return;

    const payload = {
      UserID: UserID,
      jwtToken: retrieveToken(),
    };

    try {
      const response = await fetch(buildPath('api/getGridLayout'), {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await response.json();
      if (res.error) {
        setMessage(`API Error: ${res.error}`);
      } else {
        setGridSounds(res.layout || Array(8).fill(null));
        if (res.jwtToken) {
          storeToken(res.jwtToken);
        }
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
  };

  // --- Function to save the grid layout ---
  const saveGridLayout = async (currentGridSounds: (Sound | null)[]) => {
    const UserID = getUserID();
    if (!UserID) return;

    const payload = {
      UserID: UserID,
      layout: currentGridSounds,
      jwtToken: retrieveToken(),
    };

    try {
      const response = await fetch(buildPath('api/saveGridLayout'), {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await response.json();
      if (res.error) {
        setMessage(`API Error: ${res.error}`);
      } else {
        console.log("Layout saved successfully.");
        if (res.jwtToken) {
          storeToken(res.jwtToken);
        }
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
  };

  // --- Function to search for sounds ---
  const searchSounds = async () => {
    const UserID = getUserID();
    if (!UserID) return;

    const payload = {
      UserID: UserID,
      search: searchValue,
      jwtToken: retrieveToken(),
    };

    try {
      const response = await fetch(buildPath('api/searchSounds'), {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await response.json();
      if (res.error) {
        setMessage(`API Error: ${res.error}`);
      } else {
        setSearchResults(res.results || []);
        if (res.jwtToken) {
          storeToken(res.jwtToken);
        }
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
  };
  -
    useEffect(() => {
      const loadAndSave = async () => {
        if (!isGridLoaded) {
          await fetchGridLayout();
          setIsGridLoaded(true);
        } else {
          await saveGridLayout(gridSounds);
        }
      };

      loadAndSave();
    }, [gridSounds, isGridLoaded]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchValue) {
        searchSounds();
      } else {
        setSearchResults([]);
      }
    }, 150);

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue]);

  // --- Modal and Grid interaction functions ---
  const openModal = (item: number) => {
    setSelectedGridItem(item);
    setIsModalOpen(true);
    setSearchValue('');
    setSearchResults([]);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedGridItem(null);
  };

  const handleSelectSound = (sound: Sound) => {
    if (selectedGridItem !== null) {
      const newGridSounds = [...gridSounds];
      newGridSounds[selectedGridItem - 1] = sound;
      setGridSounds(newGridSounds);
      closeModal();
    }
  };

  const handleClearSound = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newGridSounds = [...gridSounds];
    newGridSounds[index] = null;
    setGridSounds(newGridSounds);
  };

  const handlePlaySound = (sound: Sound | null) => {
    if (sound && sound.path) {
      const baseUrl = window.location.origin;
      let soundLink = `http://localhost:5000${sound.path}`;
      if (!(baseUrl.includes("localhost"))) {
        soundLink = `https://ucfgroup4.xyz${sound.path}`;
      }
      console.log('Playing sound from:', soundLink);
      const audio = new Audio(soundLink);
      audio.play().catch(e => console.error("Error playing sound:", e));
    }
  };

  return (
    <div className={styles.soundUiDiv}>
      <div className={styles.headerContainer}>
        <h1>Your sounds</h1>
        <button className={styles.UploadButton} onClick={handleUploadButtonClick}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.66699 6L8.00033 2.66667L11.3337 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 2.66667V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Upload new...</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="audio/*"
        />
        {uploadMessage && <p className={styles.uploadMessage}>{uploadMessage}</p>}
      </div>
      <div className={styles.gridContainer}>
        {gridSounds.map((sound, index) => (
          <div
            key={index}
            className={styles.gridItem}
            onClick={() => !sound && openModal(index + 1)}
          >
            {sound ? (
              <div className={styles.soundItemContent}>
                <button
                  className={styles.playButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySound(sound);
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 3l14 9-14 9V3z"></path>
                  </svg>
                </button>

                {/* --- FIX: Restored Sound Name and Clear Button --- */}
                <span className={styles.soundName}>{sound.soundName}</span>
                <button
                  className={styles.clearButton}
                  onClick={(e) => handleClearSound(e, index)}
                >
                  &times;
                </button>

              </div>
            ) : (
              "+"
            )}
          </div>
        ))}
      </div>

      {/* --- Sound Selection Modal --- */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Add Sound to Grid Item {selectedGridItem}</h2>
              <button onClick={closeModal} className={styles.closeButton}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <input
                type="text"
                placeholder="Search for a sound..."
                className={styles.searchBar}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <div className={styles.searchResults}>
                {searchResults.length > 0 ? (
                  searchResults.map((soundResult) => (
                    <div key={soundResult._id} className={styles.searchResultItem} onClick={() => handleSelectSound(soundResult)}>
                      {soundResult.soundName}
                    </div>
                  ))
                ) : (
                  <p>{searchValue ? "No results found." : "Start typing to search."}</p>
                )}
              </div>
            </div>
            {message && <p className={styles.message}>{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default SoundUI;