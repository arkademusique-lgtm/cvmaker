import React, { memo } from 'react';
import * as Icons from '../Icons';

const editorSections = [
    { id: 'personal-info', label: 'Infos', icon: Icons.User },
    { id: 'experiences', label: 'Expériences', icon: Icons.Briefcase },
    { id: 'education', label: 'Formation', icon: Icons.GraduationCap },
    { id: 'skills-hobbies', label: 'Compétences', icon: Icons.Settings },
    { id: 'visibility', label: 'Visibilité', icon: Icons.View },
];

interface EditorNavProps {
    activeSection: string;
}

export const EditorNav: React.FC<EditorNavProps> = memo(({ activeSection }) => {
    return (
        <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-200 -mx-1 p-2 mb-2 rounded-lg shadow-sm">
            <ul className="flex justify-around items-center">
                {editorSections.map(section => (
                    <li key={section.id}>
                        <a
                            href={`#${section.id}`}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === section.id ? 'bg-indigo-500 text-white shadow' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'}`}
                        >
                            <section.icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{section.label}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
});