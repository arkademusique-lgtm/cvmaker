import React from 'react';
import { PhotoShape, ThemeColor } from "../../../types";
import * as Icons from '../../Icons';

export const formatUrl = (url?: string) => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `https://${url}`;
};

interface SectionProps {
    title: string;
    color: ThemeColor;
    icon: React.ReactNode;
    children: React.ReactNode;
}

// Fix: Section component was updated to be simpler as it was not being used with all its props.
// This is a preemptive fix to align with its usage in templates.
export const Section: React.FC<SectionProps> = ({ title, color, icon, children }) => (
    <section className="mb-8">
        <h3 className={`text-xl font-bold uppercase mb-4 flex items-center gap-2 text-${color}-800`}>
            {icon} {title}
        </h3>
        <div className="space-y-6">
            {children}
        </div>
    </section>
);


// Component to display skill level as dots
export const SkillRating: React.FC<{ level: number, colorClass: string }> = ({ level, colorClass }) => (
    <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
            <div key={star} className={`w-2.5 h-2.5 rounded-full ${level >= star ? colorClass : 'bg-slate-200'}`} />
        ))}
    </div>
);


// Reusable component for Profile Photo or Initials
export const ProfilePhoto: React.FC<{
    photo?: string | null;
    initials: string;
    photoShape: PhotoShape;
    className: string; // For size, bg, etc.
    textClassName?: string; // For initials text style
    style: React.CSSProperties;
}> = ({ photo, initials, photoShape, className, textClassName, style }) => (
    <div
        style={{
            ...(photoShape === 'round' ? { borderRadius: '9999px' } : {}),
            ...style
        }}
        className={`relative overflow-hidden flex items-center justify-center ${className}`}
    >
        {photo ? (
            <img src={photo} alt="Profil" className="w-full h-full object-cover" />
        ) : (
            <span className={textClassName}>{initials}</span>
        )}
    </div>
);
