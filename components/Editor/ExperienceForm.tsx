import React, { memo } from 'react';
import { Experience, CVAction } from '../../types';
import * as Icons from '../Icons';
import { Input } from '../common/Input';
import { EditorSectionCard } from './EditorSectionCard';

interface Props {
    experiences: Experience[];
    dispatch: React.Dispatch<CVAction>;
    isFirst?: boolean;
    isLast?: boolean;
}

export const ExperienceForm: React.FC<Props> = memo(({ experiences, dispatch }) => {
    
    const addItem = () => dispatch({ type: 'ADD_ITEM', payload: { section: 'experiences' } });
    const deleteItem = (id: number) => dispatch({ type: 'DELETE_ITEM', payload: { section: 'experiences', id } });
    const handleChange = (id: number, field: keyof Experience, value: string) => {
        dispatch({ type: 'UPDATE_ITEM', payload: { section: 'experiences', id, field, value } });
    };

    return (
        <EditorSectionCard
            id="experiences"
            title="Expériences"
            icon={<Icons.Briefcase className="h-5 w-5 text-teal-500" />}
            // Fix: Changed prop name to camelCase.
            addItemAction={addItem}
        >
            {experiences.map((exp) => (
                <div key={exp.id} className="mb-4 p-3 bg-slate-50 rounded border border-slate-200 relative group">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <Input placeholder="Poste" value={exp.role} onChange={(e) => handleChange(exp.id, 'role', e.target.value)} className="font-medium bg-white" />
                        <Input placeholder="Entreprise" value={exp.company} onChange={(e) => handleChange(exp.id, 'company', e.target.value)} className="bg-white" />
                        <Input placeholder="Date" value={exp.date} onChange={(e) => handleChange(exp.id, 'date', e.target.value)} className="bg-white" />
                        <Input placeholder="Ville" value={exp.city} onChange={(e) => handleChange(exp.id, 'city', e.target.value)} className="bg-white" />
                    </div>
                    <Input as="textarea" placeholder="Description" value={exp.description} onChange={(e) => handleChange(exp.id, 'description', e.target.value)} className="h-20 text-sm bg-white" />
                    <button onClick={() => deleteItem(exp.id)} className="absolute -top-2 -right-2 text-red-400 bg-white border border-red-200 rounded-full p-0.5 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><Icons.Trash2 className="h-4 w-4" /></button>
                </div>
            ))}
        </EditorSectionCard>
    );
});