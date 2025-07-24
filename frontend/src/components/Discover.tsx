import { useState, useEffect, useCallback } from 'react';
import styles from './Discover.module.css';
import { buildPath } from '../Path';
import { retrieveToken, storeToken } from '../tokenStorage';
import { PlayIcon, StopIcon, PlusIcon, ProhibitIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';

interface Sound {
  _id: string;
  soundName: string;
  path: string;
  isDefault: boolean;
  UserID?: string;
}

const hardcodedCategories = [
  { title: 'Sounds of nostalgia', soundNames: ['PS3 Startup', 'Windows XP Shutdown', 'Wii Start', 'Roblox Oof'] },
  { title: 'Celebratory vibes', soundNames: ['Confetti', 'Yippee', 'Firework', 'Crowd Cheer'] },
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

const PlayButton = ({
                      isPlaying = false,
                      progress = 0,
                      onClick,
                      isRecommended = false,
                    }: {
  isPlaying?: boolean;
  progress?: number;
  onClick: () => void;
  isRecommended?: boolean;
}) => {
  const SIZE     = 50;
  const STROKE   = 4;
  const RADIUS   = (SIZE - STROKE) / 2;
  const CIRC     = 2 * Math.PI * RADIUS;
  const offset   = CIRC * (1 - progress);

  return (
      <button
          className={`${styles.playButton} ${isPlaying ? styles.playing : ''} ${isRecommended ? styles.recommendedPlayButton : ''}`}
          onClick={onClick}
          aria-label={isPlaying ? 'Stop' : 'Play'}
          type="button"
      >
        {isPlaying && (
            <svg
                className={styles.ring}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                style={{
                  width: `${SIZE}px`,
                  height: `${SIZE}px`
                }}
            >
              <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke="#FFF"
                  strokeWidth={STROKE}
                  strokeDasharray={CIRC}
                  strokeDashoffset={offset}

                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            </svg>
        )}

        {isPlaying ? <StopIcon size={20} /> : <PlayIcon size={20} />}
      </button>
  );
};

const Discover = () => {
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<Sound[]>([]);
  const [soundCategories, setSoundCategories] = useState<Record<string, Sound[]>>({});
  const [gridSounds, setGridSounds] = useState<(Sound | null)[]>([]);
  const [message, setMessage] = useState('');
  const [nowPlaying, setNowPlaying]   = useState<string | null>(null);
  const [progress,   setProgress]     = useState<number>(0);
  const [audio,      setAudio]        = useState<HTMLAudioElement | null>(null);

  const getUserID = (): string | null => {
    const userData = localStorage.getItem('user_data');
    if (!userData) return null;
    return JSON.parse(userData).id;
  };

  const fetchGridLayout = useCallback(async () => {
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
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

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
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const searchSounds = useCallback(async (query: string) => {
    const UserID = getUserID();
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
          newCategories['Recommended sounds'] = shuffled.slice(0, 6);
          hardcodedCategories.forEach(category => {
            newCategories[category.title] = allSounds.filter(sound =>
              category.soundNames.includes(sound.soundName)
            );
          });

          setSoundCategories(newCategories);
        }

        if (res.jwtToken) storeToken(res.jwtToken);
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

  /** play / stop toggle for a given sound */
  const togglePlay = (sound: Sound) => {
    // stop the same sound (or another one) if something is already playing
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    // clicking the currently playing card = stop
    if (nowPlaying === sound._id) {
      setNowPlaying(null);
      setProgress(0);
      setAudio(null);
      return;
    }

    // start new audio
    const baseUrl   = window.location.origin.includes('localhost')
        ? 'http://localhost:5050'
        : 'http://ucfgroup4.xyz';

    const a         = new Audio(`${baseUrl}${sound.path}`);

    const onTime  = () =>
        setProgress(a.duration ? a.currentTime / a.duration : 0);

    const onEnded = () => {
      setNowPlaying(null);
      setProgress(0);
      setAudio(null);
    };

    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended',      onEnded);

    a.play().catch(e => console.error('Audio play error:', e));

    setNowPlaying(sound._id);
    setAudio(a);
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
    void fetchGridLayout();
    void searchSounds('');

    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [fetchGridLayout, searchSounds]);

  useEffect(() => {
    if (searchValue.trim() === '') return;
    const id = setTimeout(() => searchSounds(searchValue), 250);
    return () => clearTimeout(id);
  }, [searchValue, searchSounds]);

  return (
      <div className={styles.discoverContainer}>
        <div className={styles.bannerSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Find your next sound</h1>
            <div className={styles.searchBar}>
              <div className={styles.searchInputContainer}>
                <MagnifyingGlassIcon size={20} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search"
                    className={styles.searchInput}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.messageContainer}>
              <p className={`${styles.message} ${!message ? styles.hidden : ''}`}>
                {message || '\u00A0'}
              </p>
            </div>
          </div>
        </div>

      <div className={styles.soundSections}>
        {searchValue ? (
          <div className={styles.soundCategory}>
            <h2 className={styles.categoryTitle}>Search results</h2>
            <div className={styles.soundList}>
              {searchResults.length > 0 ? (
                searchResults.map((sound) => (
                  <div key={sound._id} className={styles.soundCard}>
                    <PlayButton
                        isPlaying={nowPlaying === sound._id}
                        progress={nowPlaying === sound._id ? progress : 0}
                        onClick={() => togglePlay(sound)}
                    />
                    <span className={styles.soundName}>{sound.soundName}</span>
                    {(() => {
                      const canAdd = gridSounds.some((s) => s === null);
                      return (
                          <button
                              className={`${styles.addButton} ${
                                  canAdd ? '' : styles.full
                              }`}
                              onClick={() =>
                                  canAdd
                                      ? handleAddSound(sound)
                                      : setMessage('Your sound grid is full')
                              }
                              aria-label="Add sound"
                              type="button"
                          >
                            {canAdd ? (
                                <PlusIcon size={22} weight="regular" />
                            ) : (
                                <ProhibitIcon size={22} weight="regular" />
                            )}
                          </button>
                      );
                    })()}
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
                            <div key={sound._id} className={`${styles.soundCard} ${title === 'Recommended sounds' ? styles.recommendedCard : ''}`}>
                              <PlayButton
                                  isPlaying={nowPlaying === sound._id}
                                  progress={nowPlaying === sound._id ? progress : 0}
                                  onClick={() => togglePlay(sound)}
                                  isRecommended={title === 'Recommended sounds'}
                              />
                              <span className={styles.soundName}>{sound.soundName}</span>
                              {(() => {
                                const canAdd = gridSounds.some((s) => s === null);
                                return (
                                    <button
                                        className={`${styles.addButton} ${
                                            canAdd ? '' : styles.full
                                        } ${title === 'Recommended sounds' ? styles.recommendedAddButton : ''}`}
                                        onClick={() =>
                                            canAdd
                                                ? handleAddSound(sound)
                                                : setMessage('Your sound grid is full')
                                        }
                                        aria-label="Add sound"
                                        type="button"
                                    >
                                      {canAdd ? (
                                          <PlusIcon size={22} weight="regular" />
                                      ) : (
                                          <ProhibitIcon size={22} weight="regular" />
                                      )}
                                    </button>
                                );
                              })()}
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