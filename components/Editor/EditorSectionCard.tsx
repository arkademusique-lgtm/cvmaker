import React, { useState, memo } from 'react';
import * as Icons from '../Icons';

interface EditorSectionCardProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    addItemAction?: () => void;
    onDelete?: () => void;
    onTitleChange?: (newTitle: string) => void;
    isDeletable?: boolean;
    isTitleEditable?: boolean;
}

export const EditorSectionCard: React.FC<EditorSectionCardProps> = memo(({ 
    id, title, icon, children, 
    addItemAction, 
    onDelete, onTitleChange, 
    isDeletable = false, 
    isTitleEditable = false 
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div id={id} className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-center p-2 border-b border-slate-100 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                <div className="flex items-center gap-2">
                    <button className="text-slate-400 hover:text-slate-800 cursor-grab" onClick={e => e.stopPropagation()}>
                        <Icons.GripVertical className="h-5 w-5" />
                    </button>
                    {isTitleEditable ? (
                        <input 
                            value={title}
                            onChange={(e) => onTitleChange?.(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="text-lg font-bold text-slate-800 bg-transparent focus:bg-slate-100 rounded px-2 py-1 outline-none"
                        />
                    ) : (
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {icon} {title}
                        </h2>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {addItemAction && <button onClick={(e)=>{e.stopPropagation(); addItemAction();}} className="text-slate-500 hover:bg-slate-100 p-1 rounded-full"><Icons.Plus className="h-5 w-5" /></button>}
                    {isDeletable && <button onClick={(e)=>{e.stopPropagation(); onDelete?.();}} className="text-red-500 hover:bg-red-50 p-1 rounded-full"><Icons.Trash2 className="h-5 w-5" /></button>}
                    <button className={`text-slate-500 hover:bg-slate-100 p-1 rounded-full transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>
                        <Icons.ChevronDown className="h-5 w-5" />
                    </button>
                </div>
            </div>
            {!isCollapsed && (
                <div className="p-4 animate-in fade-in duration-150">
                    {children}
                </div>
            )}
        </div>
    );
});
