// constants.ts
import React from 'react';
import { PredefinedTheme, Template, ThemeColor, FontFamily, FontSize } from './types';
import * as Icons from './components/Icons';

export const colors: Record<ThemeColor, { name: string }> = {
    emerald: { name: 'Vert Eau' },
    blue: { name: 'Bleu Roi' },
    purple: { name: 'Violet' },
    rose: { name: 'Rose Vif' },
    slate: { name: 'Gris Sobre' },
    orange: { name: 'Orange' },
    indigo: { name: 'Indigo' },
    teal: { name: 'Sarcelle' },
    cyan: { name: 'Cyan' },
    pink: { name: 'Rose' },
    amber: { name: 'Ambre' },
    lime: { name: 'Citron' },
    gray: { name: 'Gris Neutre' },
    yellow: { name: 'Jaune Vif' },
    sky: { name: 'Bleu Ciel' },
};
export const colorKeys = Object.keys(colors) as ThemeColor[];

export const gradients: Record<ThemeColor, string> = {
    emerald: 'linear-gradient(to bottom right, #6ee7b7, #10b981)',
    blue: 'linear-gradient(to bottom right, #93c5fd, #3b82f6)',
    purple: 'linear-gradient(to bottom right, #c084fc, #9333ea)',
    rose: 'linear-gradient(to bottom right, #fb7185, #e11d48)',
    slate: 'linear-gradient(to bottom right, #94a3b8, #475569)',
    orange: 'linear-gradient(to bottom right, #fb923c, #f97316)',
    indigo: 'linear-gradient(to bottom right, #a5b4fc, #6366f1)',
    teal: 'linear-gradient(to bottom right, #5eead4, #14b8a6)',
    cyan: 'linear-gradient(to bottom right, #67e8f9, #06b6d4)',
    pink: 'linear-gradient(to bottom right, #f9a8d4, #ec4899)',
    amber: 'linear-gradient(to bottom right, #fcd34d, #f59e0b)',
    lime: 'linear-gradient(to bottom right, #bef264, #84cc16)',
    gray: 'linear-gradient(to bottom right, #d1d5db, #6b7280)',
    yellow: 'linear-gradient(to bottom right, #fde047, #eab308)',
    sky: 'linear-gradient(to bottom right, #7dd3fc, #0ea5e9)',
};

export const templates: { id: Template, icon: React.FC<{className?: string}>, label: string, rotate?: boolean, mirror?: boolean }[] = [
    {id: 'sidebar', icon: Icons.Layout, label: 'Moderne'},
    {id: 'header', icon: Icons.AlignCenter, label: 'Classique'},
    {id: 'minimal', icon: Icons.FileText, label: 'Minimal'},
    {id: 'elegant', icon: Icons.Star, label: 'Luxe'},
    {id: 'creative', icon: Icons.PenTool, label: 'Créatif'},
    {id: 'timeline', icon: Icons.AlignCenter, label: 'Chronos', rotate: true},
    {id: 'corporate', icon: Icons.Grid, label: 'Strict'},
    {id: 'tech', icon: Icons.Box, label: 'Tech'},
    {id: 'split', icon: Icons.Columns, label: 'Double'},
    {id: 'compact', icon: Icons.Minimize2, label: 'Compact'},
    {id: 'centered', icon: Icons.AlignCenterHorizontal, label: 'Centré'},
    {id: 'top-focus', icon: Icons.Archive, label: 'Focus Haut'},
    {id: 'sidebar-right', icon: Icons.Layout, label: 'Moderne D.', mirror: true},
    {id: 'split-wide', icon: Icons.Columns, label: 'Large 70/30'},
    {id: 'minimal-icons', icon: Icons.FileText, label: 'Minimal+'},
    {id: 'header-photo', icon: Icons.AlignCenter, label: 'Header+'},
    {id: 'dark-modern', icon: Icons.SlidersHorizontal, label: 'Moderne Sombre'},
    {id: 'infographic', icon: Icons.Sparkles, label: 'Infographie'},
    {id: 'two-tone', icon: Icons.Library, label: 'Bicolore'},
    {id: 'moderno', icon: Icons.User, label: 'Moderno'},
];
export const templateKeys = templates.map(t => t.id);

export const fonts: { id: FontFamily, label: string, className: string }[] = [
    { id: 'sans', label: 'Sans', className: 'font-sans' },
    { id: 'serif', label: 'Serif', className: 'font-serif' },
    { id: 'mono', label: 'Mono', className: 'font-mono' },
    { id: 'script', label: 'Script', className: "font-['Dancing_Script',_cursive]" }
];
export const fontKeys = fonts.map(f => f.id);

export const fontSizes: { id: FontSize, label: string }[] = [
    { id: 'sm', label: 'Petite' },
    { id: 'base', label: 'Moyenne' },
    { id: 'lg', label: 'Grande' },
];
export const fontSizeKeys = fontSizes.map(f => f.id);

export const totalCombinations = templates.length * colorKeys.length * fonts.length * fontSizes.length;

const generateThemes = (): PredefinedTheme[] => {
    const themes: PredefinedTheme[] = [];
    const mainTemplates: Template[] = ['sidebar', 'header', 'minimal', 'elegant', 'creative', 'timeline', 'corporate', 'tech', 'split', 'dark-modern', 'two-tone', 'moderno'];
    const secondaryTemplates: Template[] = templates.map(t => t.id).filter(t => !mainTemplates.includes(t));

    // Generate a lot for main templates
    mainTemplates.forEach(t => {
        const templateInfo = templates.find(ti => ti.id === t);
        if (!templateInfo) return;
        
        colorKeys.forEach(c => {
            const font: FontFamily = t === 'tech' ? 'mono' : t === 'elegant' ? 'serif' : 'sans';
            const colorInfo = colors[c];
            themes.push({ name: `${templateInfo.label} ${colorInfo.name}`, t, c, f: font });
        });
    });

    // Generate some for secondary templates
    secondaryTemplates.forEach(t => {
        const templateInfo = templates.find(ti => ti.id === t);
        if (!templateInfo) return;
        ['indigo', 'slate', 'emerald', 'rose', 'amber', 'teal', 'sky'].forEach(cKey => {
            const c = cKey as ThemeColor;
            const colorInfo = colors[c];
            themes.push({ name: `${templateInfo.label} ${colorInfo.name}`, t, c, f: 'sans' });
        });
    });
    
    // Add some creative font pairings
     ['creative', 'elegant', 'sidebar', 'header-photo'].forEach(tKey => {
         const t = tKey as Template;
         const templateInfo = templates.find(ti => ti.id === t);
         if (!templateInfo) return;
        ['rose', 'purple', 'amber', 'cyan'].forEach(cKey => {
            const c = cKey as ThemeColor;
            const colorInfo = colors[c];
            themes.push({ name: `${templateInfo.label} ${colorInfo.name} Script`, t, c, f: 'script' });
        });
    });

    return themes;
}


export const predefinedThemes = generateThemes();