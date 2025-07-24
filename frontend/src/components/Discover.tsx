import { useState, useEffect } from 'react';
import styles from './Discover.module.css';
import { buildPath } from '../Path';
import { retrieveToken, storeToken } from '../tokenStorage';

interface Sound {
  _id: string;
  soundName: string;
  path: string;
  isDefault: boolean;
  UserID?: string;
}

const hardcodedCategories = [
  { title: 'Sounds of Nostalgia', soundNames: ['PS3 Startup', 'Windows XP Shutdown', 'Wii Start', 'Roblox Oof'] },
  { title: 'Celebration', soundNames: ['Confetti', 'Yippee', 'Firework', 'Crowd Cheer'] },
  { title: 'Sports', soundNames: ['NFL Fox', 'Wii Sports', 'UCF Chant', 'MLB Fox'] },
];

const shuffleArray = (array: Sound[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};


const IconPlay = () => (
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
);

const Discover = () => {
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<Sound[]>([]);
  const [soundCategories, setSoundCategories] = useState<Record<string, Sound[]>>({});
  const [gridSounds, setGridSounds] = useState<(Sound | null)[]>([]);
  const [message, setMessage] = useState('');

  const getUserID = (): string | null => {
    const userData = localStorage.getItem('user_data');
    if (!userData) {
      return null;
    }
    return JSON.parse(userData).id;
  };

  const fetchGridLayout = async () => {
    const UserID = getUserID();
    if (!UserID) return;

    try {
      const response = await fetch(buildPath('api/getGridLayout'), {
        method: 'POST',
        body: JSON.stringify({ UserID, jwtToken: retrieveToken() }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await response.json();
      if (res.error) {
        setMessage(`API Error: ${res.error}`);
      } else {
        setGridSounds(res.layout || Array(8).fill(null));
        if (res.jwtToken) storeToken(res.jwtToken);
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
  };

  const saveGridLayout = async (newGrid: (Sound | null)[]) => {
    const UserID = getUserID();
    if (!UserID) return;

    try {
      const response = await fetch(buildPath('api/saveGridLayout'), {
        method: 'POST',
        body: JSON.stringify({ UserID, layout: newGrid, jwtToken: retrieveToken() }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await response.json();
      if (res.error) {
        setMessage(`API Error: ${res.error}`);
      } else {
        if (res.jwtToken) storeToken(res.jwtToken);
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
  };

  const searchSounds = async (query: string) => {
    const UserID = -1;
    if (!UserID) {
      setMessage('Please log in to search for sounds.');
      return;
    }

    try {
      const response = await fetch(buildPath('api/searchSounds'), {
        method: 'POST',
        body: JSON.stringify({ UserID, search: query, jwtToken: retrieveToken() }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await response.json();
      if (res.error) {
        setMessage(`API Error: ${res.error}`);
        setSearchResults([]);
      } else {
        const allSounds: Sound[] = res.results || [];
        setSearchResults(allSounds);

        if (query === '') {
          const newCategories: Record<string, Sound[]> = {};
          const shuffled = shuffleArray(allSounds);
          newCategories['Popular Sounds'] = shuffled.slice(0, 6);
          hardcodedCategories.forEach(category => {
            newCategories[category.title] = allSounds.filter(sound =>
              category.soundNames.includes(sound.soundName)
            );
          });

          setSoundCategories(newCategories);
        }

        if (res.jwtToken) storeToken(res.jwtToken);
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
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

  const handleAddSound = async (soundToAdd: Sound) => {
    const firstEmptyIndex = gridSounds.findIndex(slot => slot === null);

    if (firstEmptyIndex !== -1) {
      const newGridSounds = [...gridSounds];
      newGridSounds[firstEmptyIndex] = soundToAdd;
      setGridSounds(newGridSounds);
      await saveGridLayout(newGridSounds);
      setMessage(`'${soundToAdd.soundName}' added to your grid!`);
    } else {
      setMessage('Your sound grid is full.');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  useEffect(() => {
    document.body.style.backgroundColor = '#1C1C1EB3';
    fetchGridLayout();
    searchSounds('');

    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchValue) {
        searchSounds(searchValue);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue]);

  return (
    <div className={styles.discoverContainer}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>Find your next sound</h1>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search for sounds..."
            className={styles.searchInput}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        <div className={styles.messageContainer}>
          <p className={`${styles.message} ${!message ? styles.hidden : ''}`}>
            {message || '\u00A0'}
          </p>
        </div>
      </div>

      <div className={styles.soundSections}>
        {searchValue ? (
          <div className={styles.soundCategory}>
            <h2 className={styles.categoryTitle}>Search Results</h2>
            <div className={styles.soundList}>
              {searchResults.length > 0 ? (
                searchResults.map((sound) => (
                  <div key={sound._id} className={styles.soundCard}>
                    <button className={styles.playButton} onClick={() => handlePlaySound(sound)}>
                      <IconPlay />
                    </button>
                    <span className={styles.soundName}>{sound.soundName}</span>
                    <button className={styles.addButton} onClick={() => handleAddSound(sound)}>+</button>
                  </div>
                ))
              ) : (
                <p className={styles.noResults}>No results found.</p>
              )}
            </div>
          </div>
        ) : (
          Object.entries(soundCategories).map(([title, sounds]) => (
            <div key={title} className={styles.soundCategory}>
              <h2 className={styles.categoryTitle}>{title}</h2>
              <div className={styles.soundList}>
                {sounds.length > 0 ? (
                  sounds.map((sound) => (
                    <div key={sound._id} className={styles.soundCard}>
                      <button className={styles.playButton} onClick={() => handlePlaySound(sound)}>
                        <IconPlay />
                      </button>
                      <span className={styles.soundName}>{sound.soundName}</span>
                      <button className={styles.addButton} onClick={() => handleAddSound(sound)}>+</button>
                    </div>
                  ))
                ) : (
                  <p className={styles.noResults}>Loading sounds...</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Discover;