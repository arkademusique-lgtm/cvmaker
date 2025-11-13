import React, { memo } from 'react';
import { VisibilitySettings } from '../../types';
import * as Icons from '../Icons';
import { EditorSection } from '../common/EditorSection';

interface ToggleSwitchProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = memo(({ label, checked, onChange }) => {
    const handleToggle = () => onChange(!checked);

    return (
        <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-50 rounded-md transition-colors">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={checked} onChange={handleToggle} />
                <div className="block w-12 h-6 rounded-full transition bg-slate-300 peer-checked:bg-indigo-500"></div>
                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:transform peer-checked:translate-x-6"></div>
            </div>
        </label>
    );
});

interface VisibilityPanelProps {
    visibility: VisibilitySettings;
    setVisibility: React.Dispatch<React.SetStateAction<VisibilitySettings>>;
}

export const VisibilityPanel: React.FC<VisibilityPanelProps> = memo(({ visibility, setVisibility }) => {
    
    const handleVisibilityChange = (key: keyof VisibilitySettings) => (checked: boolean) => {
        setVisibility(prev => ({ ...prev, [key]: checked }));
    };

    return (
        <EditorSection
            id="visibility"
            title="Sections Visibles"
            icon={<Icons.View className="h-5 w-5 text-slate-500" />}
            borderColorClass="border-slate-500"
        >
            <div className="space-y-2">
                <ToggleSwitch 
                    label="Lien LinkedIn"
                    checked={visibility.linkedin}
                    onChange={handleVisibilityChange('linkedin')}
                />
                <ToggleSwitch 
                    label="Lien GitHub"
                    checked={visibility.github}
                    onChange={handleVisibilityChange('github')}
                />
                 <ToggleSwitch 
                    label="Lien Portfolio"
                    checked={visibility.portfolio}
                    onChange={handleVisibilityChange('portfolio')}
                />
                 <ToggleSwitch 
                    label="Section Loisirs"
                    checked={visibility.hobbies}
                    onChange={handleVisibilityChange('hobbies')}
                />
                <ToggleSwitch 
                    label="Ligne d'infos (Permis, etc.)"
                    checked={visibility.infos}
                    onChange={handleVisibilityChange('infos')}
                />
                 <ToggleSwitch 
                    label="Afficher les niveaux de compétence"
                    checked={visibility.showSkillLevels}
                    onChange={handleVisibilityChange('showSkillLevels')}
                />
            </div>
        </EditorSection>
    );
});