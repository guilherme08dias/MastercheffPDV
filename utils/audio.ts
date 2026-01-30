// Sons curtos em Base64 para evitar latência de rede e dependências externas

// Beep curto e suave (Sucesso)
const SUCCESS_BEEP = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVBxr';

// Som de erro (Buzz curto) - Placeholder, usando um tom mais grave
const ERROR_BUZZ = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ+3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7c=';

export const playSuccess = () => {
    try {
        const audio = new Audio(SUCCESS_BEEP);
        audio.volume = 0.5;
        audio.play().catch(e => console.warn('Audio blocked:', e));
    } catch (e) {
        console.warn('Audio playback failed', e);
    }
};

export const playError = () => {
    try {
        const audio = new Audio(ERROR_BUZZ);
        audio.volume = 0.5;
        audio.play().catch(e => console.warn('Audio blocked:', e));
    } catch (e) {
        console.warn('Audio playback failed', e);
    }
};
