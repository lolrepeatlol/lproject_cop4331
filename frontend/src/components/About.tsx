import styles from './About.module.css';

const About = () => {
    return (
        <div className={styles.aboutContainer}>
            <main className={styles.aboutMain}>
                <h1 className={styles.appTitle}>Boardy</h1>
                <div className={styles.version}>v1.0.0</div>
                <div className={styles.appDescription}>Your personal soundboard app.</div>
                <ul className={styles.features}>
                    <li>Assign your favorite sounds</li>
                    <li>Organize your library</li>
                    <li>Discover new audio</li>
                </ul>
                <div className={styles.credits}>
                    <span>Developed by:</span>
                    <div>Alexei Solonari<br/>Jose Ojeda<br/>Paul Bagaric<br/>Li Fitzgerald<br/>Jordan Khan</div>
                </div>
            </main>
        </div>
    );
};

export default About;