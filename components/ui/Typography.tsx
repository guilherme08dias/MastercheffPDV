import React from 'react';

interface TypographyProps {
    children: React.ReactNode;
    className?: string; // Allow overrides
}

export const PageTitle: React.FC<TypographyProps> = ({ children, className = '' }) => {
    return (
        <h1 className={`text-2xl md:text-5xl font-bold tracking-tight text-white mb-2 transition-all ${className}`}>
            {children}
        </h1>
    );
};

export const SectionHeader: React.FC<TypographyProps> = ({ children, className = '' }) => {
    return (
        <h2 className={`text-xl md:text-3xl font-bold text-white mb-6 tracking-tight transition-all ${className}`}>
            {children}
        </h2>
    );
};
