import React, { memo } from 'react';

interface EditorSectionProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    borderColorClass: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}

export const EditorSection: React.FC<EditorSectionProps> = memo(({ id, title, icon, borderColorClass, children, actions }) => {
    return (
        <div id={id} className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${borderColorClass}`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {icon} {title}
                </h2>
                {actions}
            </div>
            {children}
        </div>
    );
});