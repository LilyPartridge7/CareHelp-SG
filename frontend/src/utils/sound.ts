export const playPopSound = () => {
    try {
        // A minimal, short "pop/click" sound encoded in base64 audio/wav
        const popBase64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAD//wEA/v8=";
        const audio = new Audio(popBase64);
        audio.volume = 0.5; // Keep it subtle and professional
        audio.play().catch(e => {
            // Ignore auto-play blocking errors silently
            console.debug("Audio play blocked by browser policy until interaction.", e);
        });
    } catch (err) {
        console.debug("Audio playback failed.", err);
    }
};
