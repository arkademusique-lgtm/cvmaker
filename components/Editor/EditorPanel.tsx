import React from 'react';
import { CVData, CVAction, VisibilitySettings, SectionKey } from '../../types';
import { PersonalInfoForm } from './PersonalInfoForm';
import { ExperienceForm } from './ExperienceForm';
import { EducationForm } from './EducationForm';
import { SkillsHobbiesForm } from './SkillsHobbiesForm';
import { VisibilityPanel } from './VisibilityPanel';
import { CustomSectionForm } from './CustomSectionForm';
import { DesignStudio, DesignProps } from '../Design/DesignStudio';
import * as Icons from '../Icons';

interface EditorPanelProps {
    cvData: CVData;
    dispatch: React.Dispatch<CVAction>;
    showDesignPanel: boolean;
    setShowDesignPanel: (show: boolean) => void;
    designProps: DesignProps;
    visibility: VisibilitySettings;
    setVisibility: React.Dispatch<React.SetStateAction<VisibilitySettings>>;
    className?: string;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ 
    cvData, dispatch, showDesignPanel, setShowDesignPanel, designProps, 
    visibility, setVisibility, className 
}) => {
    const dragSectionIndex = React.useRef<number | null>(null);
    const dragOverSectionIndex = React.useRef<number | null>(null);

    const handleSectionDragStart = (index: number) => {
        dragSectionIndex.current = index;
    };

    const handleSectionDragEnter = (index: number) => {
        dragOverSectionIndex.current = index;
    };

    const handleSectionDrop = () => {
        if (dragSectionIndex.current !== null && dragOverSectionIndex.current !== null && dragSectionIndex.current !== dragOverSectionIndex.current) {
            dispatch({ 
                type: 'REORDER_SECTION', 
                payload: {
                    startIndex: dragSectionIndex.current,
                    endIndex: dragOverSectionIndex.current
                }
            });
        }
        dragSectionIndex.current = null;
        dragOverSectionIndex.current = null;
    };
    
    const addCustomSection = () => {
        dispatch({ type: 'ADD_CUSTOM_SECTION' });
    };

    const sectionMap: Record<string, React.ReactNode> = {
        experiences: <ExperienceForm experiences={cvData.experiences} dispatch={dispatch} />,
        education: <EducationForm education={cvData.education} dispatch={dispatch} />,
        skills: <SkillsHobbiesForm skills={cvData.skills} hobbies={cvData.hobbies} dispatch={dispatch} />,
    };

    return (
        <div className={`flex-col w-full lg:w-[450px] flex-shrink-0 print:hidden ${className}`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 border-r border-slate-200 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                {showDesignPanel && (
                    <DesignStudio {...designProps} onClose={() => setShowDesignPanel(false)} />
                )}

                <PersonalInfoForm personalData={cvData.personal} dispatch={dispatch} />
                
                {cvData.sectionOrder.map((sectionKey, index) => {
                    let component;
                    if (sectionKey.startsWith('custom_')) {
                        const sectionId = parseInt(sectionKey.split('_')[1], 10);
                        const customSection = cvData.customSections.find(cs => cs.id === sectionId);
                        if (customSection) {
                            component = <CustomSectionForm section={customSection} dispatch={dispatch} />;
                        }
                    } else {
                        component = sectionMap[sectionKey];
                    }

                    if (!component) return null;

                    return (
                        <div 
                            key={sectionKey}
                            draggable
                            onDragStart={() => handleSectionDragStart(index)}
                            onDragEnter={() => handleSectionDragEnter(index)}
                            onDragEnd={handleSectionDrop}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            {component}
                        </div>
                    );
                })}
                
                <button
                    onClick={addCustomSection}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                >
                    <Icons.Plus className="h-5 w-5" />
                    Ajouter une section personnalisée
                </button>
                
                <VisibilityPanel visibility={visibility} setVisibility={setVisibility} />
            </div>
        </div>
    );
};
