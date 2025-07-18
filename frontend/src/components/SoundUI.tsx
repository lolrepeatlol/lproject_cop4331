import React, { useState, useEffect } from 'react';
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
  const [isGridLoaded, setIsGridLoaded] = useState(false); // 


  const getUserID = (): string | null => {
    const userData = localStorage.getItem('user_data');
    if (!userData) {
      setMessage('User data not found. Please log in again.');
      return null;
    }
    const user = JSON.parse(userData);
    return user.id;
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

  // Function to search for sounds
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
    });

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue]);

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

      console.log(`Sound "${sound.soundName}" added to grid item ${selectedGridItem}`);
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
        soundLink = `http://ucfgroup4.xyz${sound.path}`;
      }
      console.log('Playing sound from:', soundLink);
      const audio = new Audio(soundLink);
      audio.play().catch(e => console.error("Error playing sound:", e));
    }
  };

return (
    <div className={styles.soundUiDiv}>
      <label htmlFor="Sound">Your Soundboard</label>

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
                    e.stopPropagation(); // Prevent modal from opening on play
                    handlePlaySound(sound);
                  }}
                >
                  ▶
                </button>
                <span className={styles.soundName}>{sound.soundName}</span>
                <button
                  className={styles.clearButton}
                  onClick={(e) => handleClearSound(e, index)}
                >
                  &times; {/* This is an "x" symbol */}
                </button>
              </div>
            ) : (
              "+"
            )}
          </div>
        ))}
      </div>

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