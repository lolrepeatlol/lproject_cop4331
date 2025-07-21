import styles from './Discover.module.css';

const soundSections = [
  {
    title: "Popular Sounds",
    sounds: ["Rain", "Thunder", "Ocean Waves"]
  },
  {
    title: "Nature",
    sounds: ["Birds", "Wind", "Forest"]
  },
  {
    title: "Urban",
    sounds: ["City Traffic", "Subway", "Cafe"]
  }
];

const Discover = () => {
  return (
    <>
      <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Find your next sound</h1>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search"
              className={styles.searchInput}
            />
            <button className={styles.searchButton}>→</button>
          </div>
      </div>

  
      
        
      {/* Sound sections */}
      <div className={styles.soundSections}>
        {soundSections.map((section, idx) => (
          <div key={idx} className={styles.soundCategory}>
            <h2 className={styles.categoryTitle}>{section.title}</h2>
            <div className={styles.soundList}>
              {section.sounds.map((sound, sIdx) => (
                <div key={sIdx} className={styles.soundCard}>
                  <button className={styles.playButton}>▶</button>
                  <span className={styles.soundName}>{sound}</span>
                  <button className={styles.addButton}>+</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      
    </>
  );
};

export default Discover;
