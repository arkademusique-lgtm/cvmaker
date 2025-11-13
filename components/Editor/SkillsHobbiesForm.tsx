import React, { memo } from 'react';
import { CVAction, Skill } from '../../types';
import * as Icons from '../Icons';
import { Input } from '../common/Input';
import { EditorSectionCard } from './EditorSectionCard';

interface Props {
    skills: Skill[];
    hobbies: string[];
    dispatch: React.Dispatch<CVAction>;
}

const StarRating: React.FC<{ level: number, onSetLevel: (level: number) => void }> = ({ level, onSetLevel }) => (
    <div className="flex">
        {[1, 2, 3, 4, 5].map(star => (
            <button key={star} onClick={() => onSetLevel(star)} className="text-yellow-400 hover:text-yellow-500">
                <Icons.Star className={`h-5 w-5 ${level >= star ? 'fill-current' : ''}`} />
            </button>
        ))}
    </div>
);


export const SkillsHobbiesForm: React.FC<Props> = memo(({ skills, hobbies, dispatch }) => {
    
    const handleSkillChange = (id: number, field: 'name' | 'level', value: string | number) => {
        dispatch({ type: 'UPDATE_SKILL', payload: { id, field, value } });
    };
    const addSkill = () => dispatch({ type: 'ADD_SKILL' });
    const removeSkill = (id: number) => dispatch({ type: 'DELETE_SKILL', payload: { id } });

    const handleHobbyChange = (index: number, value: string) => {
        dispatch({ type: 'UPDATE_HOBBY', payload: { index, value } });
    };
    const addHobby = () => dispatch({ type: 'ADD_HOBBY' });
    const removeHobby = (index: number) => dispatch({ type: 'DELETE_HOBBY', payload: { index } });
    
    return (
        <EditorSectionCard
            id="skills-hobbies"
            title="Compétences & Loisirs"
            icon={<Icons.Settings className="h-5 w-5 text-violet-500" />}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold mb-2 text-sm text-slate-500 uppercase">Compétences</h3>
                    {skills.map((skill) => (
                        <div key={skill.id} className="flex flex-col gap-2 mb-3 bg-slate-50 p-2 rounded border">
                            <div className="flex gap-2">
                                <Input value={skill.name} onChange={(e) => handleSkillChange(skill.id, 'name', e.target.value)} className="flex-1" placeholder="Compétence" />
                                <button onClick={() => removeSkill(skill.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded"><Icons.Trash2 className="h-4 w-4" /></button>
                            </div>
                            <StarRating level={skill.level} onSetLevel={(level) => handleSkillChange(skill.id, 'level', level)} />
                        </div>
                    ))}
                    <button onClick={addSkill} className="text-sm text-violet-600 flex items-center gap-1 mt-1 font-medium hover:text-violet-800"><Icons.Plus className="h-3 w-3" /> Ajouter</button>
                </div>
                <div>
                    <h3 className="font-semibold mb-2 text-sm text-slate-500 uppercase">Loisirs</h3>
                    {hobbies.map((hobby, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                            <Input value={hobby} onChange={(e) => handleHobbyChange(idx, e.target.value)} className="flex-1" placeholder="Loisir" />
                            <button onClick={() => removeHobby(idx)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded"><Icons.Trash2 className="h-4 w-4" /></button>
                        </div>
                    ))}
                    <button onClick={addHobby} className="text-sm text-violet-600 flex items-center gap-1 mt-1 font-medium hover:text-violet-800"><Icons.Plus className="h-3 w-3" /> Ajouter</button>
                </div>
            </div>
        </EditorSectionCard>
    );
});