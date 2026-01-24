import { useEffect } from 'react';

interface AutoPrintProps {
    onComplete?: () => void;
}

export const AutoPrint: React.FC<AutoPrintProps> = ({ onComplete }) => {
    useEffect(() => {
        console.log("AutoPrint: Component mounted, starting timer...");
        // Pequeno delay para garantir que o estilo carregou e o DOM atualizou
        const timer = setTimeout(() => {
            console.log("AutoPrint: Calling window.print()");
            window.print();

            // Executar callback após a janela de impressão fechar (ou imediatamente no modo kiosk)
            if (onComplete) {
                console.log("AutoPrint: Calling onComplete");
                onComplete();
            }
        }, 1000); // Increased to 1000ms

        return () => clearTimeout(timer);
    }, [onComplete]);

    return null; // Este componente não renderiza nada visual
};
