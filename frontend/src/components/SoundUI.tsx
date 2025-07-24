import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './SoundUI.module.css';
import { buildPath } from '../Path';
import { retrieveToken, storeToken } from '../tokenStorage';
import { PlayIcon, StopIcon, PlusIcon, UploadSimpleIcon, XCircleIcon } from '@phosphor-icons/react';

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
  const [audio,      setAudio]      = useState<HTMLAudioElement | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [progress,   setProgress]   = useState<number>(0);

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

  const getUserID = useCallback((): string | null => {
    const userData = localStorage.getItem('user_data');
    if (!userData) {
      setMessage('User data not found. Please log in again.');
      return null;
    }
    const user = JSON.parse(userData);
    return user.id;
  }, []);

  const PlayButton = ({
                        isPlaying = false,
                        progress   = 0,
                        onClick,
                      }: {
    isPlaying?: boolean;
    progress?: number;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
  }) => {
    /* same geometry you use in Discover -------------------------------- */
    const SIZE   = 50;
    const STROKE = 4;
    const R      = (SIZE - STROKE) / 2;
    const CIRC   = 2 * Math.PI * R;
    const offset = CIRC * (1 - progress);

    return (
        <button
            className={`${styles.playButton} ${isPlaying ? styles.playing : ''}`}
            onClick={onClick}
            aria-label={isPlaying ? 'Stop' : 'Play'}
            type="button"
        >
          {isPlaying && (
              <svg
                  className={styles.ring}
                  viewBox={`0 0 ${SIZE} ${SIZE}`}
                  style={{ width: SIZE, height: SIZE }}
              >
                <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={R}
                    fill="none"
                    stroke="#FFF"
                    strokeWidth={STROKE}
                    strokeDasharray={CIRC}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
              </svg>
          )}

          {/* phosphor icons already in your project */}
          {isPlaying
              ? <StopIcon  size={20} weight="regular"  />
              : <PlayIcon  size={20} weight="regular"  />}
        </button>
    );
  };

  /* identical togglePlay to Discover --------------------------------- */
  const togglePlay = useCallback((sound: Sound) => {
    /* stop any current sound */
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    /* clicking the same card = stop */
    if (nowPlaying === sound._id) {
      setNowPlaying(null);
      setProgress(0);
      setAudio(null);
      return;
    }

    /* start new audio */
    const baseUrl = window.location.origin.includes('localhost')
        ? 'http://localhost:5000'
        : 'http://ucfgroup4.xyz';
    const a = new Audio(`${baseUrl}${sound.path}`);

    a.addEventListener('timeupdate', () =>
        setProgress(a.duration ? a.currentTime / a.duration : 0)
    );
    a.addEventListener('ended', () => {
      setNowPlaying(null);
      setProgress(0);
      setAudio(null);
    });

    a.play().catch(console.error);

    setNowPlaying(sound._id);
    setAudio(a);
  }, [audio, nowPlaying]);

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadMessage(`An error occurred: ${msg}`);
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
  const fetchGridLayout = useCallback(async () => {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadMessage(`An error occurred: ${msg}`);
    }
  }, [getUserID]);

  // --- Function to save the grid layout ---
  const saveGridLayout = useCallback(async (currentGridSounds: (Sound | null)[]) => {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadMessage(`An error occurred: ${msg}`);
    }
  }, [getUserID]);

  // --- Function to search for sounds ---
  const searchSounds = useCallback(async () => {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadMessage(`An error occurred: ${msg}`);
    }
  }, [getUserID, searchValue]);

    useEffect(() => {
      const loadAndSave = async () => {
        if (!isGridLoaded) {
          await fetchGridLayout();
          setIsGridLoaded(true);
        } else {
          await saveGridLayout(gridSounds);
        }
      };

      void loadAndSave();
    }, [gridSounds, isGridLoaded, fetchGridLayout, saveGridLayout]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchValue) {
        void searchSounds();
      } else {
        setSearchResults([]);
      }
    }, 150);

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue, searchSounds]);

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

      /* halt audio if we just removed the playing one */
      if (sound?._id) stopIfCleared(sound._id);

      closeModal();
    }
  };

  const handleClearSound = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.stopPropagation();
    const newGridSounds = [...gridSounds];
    newGridSounds[index] = null;
    setGridSounds(newGridSounds);
  };

  /* if a playing sound is cleared from the grid, stop it */
  const stopIfCleared = useCallback((id: string) => {
    if (nowPlaying === id && audio) {
      audio.pause();
      setAudio(null);
      setNowPlaying(null);
      setProgress(0);
    }
  }, [audio, nowPlaying]);


  return (
    <div className={styles.soundUiDiv}>
      <div className={styles.headerContainer}>
        <h1>Your sounds</h1>
        <button className={styles.UploadButton} onClick={handleUploadButtonClick}>
          <UploadSimpleIcon size={20} weight="regular" />
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
                <PlayButton
                    isPlaying={nowPlaying === sound._id}
                    progress={nowPlaying === sound._id ? progress : 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay(sound);
                    }}
                />
                <span className={styles.soundName}>{sound.soundName}</span>
                <button
                  className={styles.clearButton}
                  onClick={(e) => handleClearSound(e, index)}
                >
                  <XCircleIcon size={20} weight="regular" />
                </button>
              </div>
            ) : (
              <PlusIcon size={32} weight="regular" className={styles.emptyIcon}/>
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