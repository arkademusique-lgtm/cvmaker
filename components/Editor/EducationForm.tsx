import React, { memo } from 'react';
import { Education, CVAction } from '../../types';
import * as Icons from '../Icons';
import { Input } from '../common/Input';
import { EditorSectionCard } from './EditorSectionCard';

interface Props {
    education: Education[];
    dispatch: React.Dispatch<CVAction>;
}

export const EducationForm: React.FC<Props> = memo(({ education, dispatch }) => {

    const addItem = () => dispatch({ type: 'ADD_ITEM', payload: { section: 'education' } });
    const deleteItem = (id: number) => dispatch({ type: 'DELETE_ITEM', payload: { section: 'education', id } });
    const handleChange = (id: number, field: keyof Education, value: string) => {
        dispatch({ type: 'UPDATE_ITEM', payload: { section: 'education', id, field, value } });
    };

    return (
        <EditorSectionCard
            id="education"
            title="Formation"
            icon={<Icons.GraduationCap className="h-5 w-5 text-orange-500" />}
            addItemAction={addItem}
        >
            {education.map((edu) => (
                <div key={edu.id} className="mb-4 p-3 bg-slate-50 rounded border border-slate-200 relative group">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <Input placeholder="Diplôme" value={edu.degree} onChange={(e) => handleChange(edu.id, 'degree', e.target.value)} className="font-medium bg-white" />
                        <Input placeholder="École / Organisme" value={edu.school} onChange={(e) => handleChange(edu.id, 'school', e.target.value)} className="bg-white" />
                        <Input placeholder="Date" value={edu.date} onChange={(e) => handleChange(edu.id, 'date', e.target.value)} className="bg-white" />
                        <Input placeholder="Ville" value={edu.city} onChange={(e) => handleChange(edu.id, 'city', e.target.value)} className="bg-white" />
                    </div>
                    <Input as="textarea" placeholder="Description (optionnel)" value={edu.description} onChange={(e) => handleChange(edu.id, 'description', e.target.value)} className="h-20 text-sm bg-white" />
                     <button onClick={() => deleteItem(edu.id)} className="absolute -top-2 -right-2 text-red-400 bg-white border border-red-200 rounded-full p-0.5 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><Icons.Trash2 className="h-4 w-4" /></button>
                </div>
            ))}
        </EditorSectionCard>
    );
});
