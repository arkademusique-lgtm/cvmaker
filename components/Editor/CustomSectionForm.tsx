import React, { memo } from 'react';
import { CustomSection, CVAction } from '../../types';
import * as Icons from '../Icons';
import { Input } from '../common/Input';
import { EditorSectionCard } from './EditorSectionCard';

interface Props {
    section: CustomSection;
    dispatch: React.Dispatch<CVAction>;
}

export const CustomSectionForm: React.FC<Props> = memo(({ section, dispatch }) => {
    
    const updateTitle = (title: string) => dispatch({ type: 'UPDATE_CUSTOM_SECTION_TITLE', payload: { sectionId: section.id, title } });
    const deleteSection = () => dispatch({ type: 'DELETE_CUSTOM_SECTION', payload: { sectionId: section.id } });
    const addItem = () => dispatch({ type: 'ADD_CUSTOM_ITEM', payload: { sectionId: section.id } });
    const deleteItem = (itemId: number) => dispatch({ type: 'DELETE_CUSTOM_ITEM', payload: { sectionId: section.id, itemId } });

    const handleChange = (itemId: number, field: any, value: string) => {
        dispatch({ type: 'UPDATE_CUSTOM_ITEM', payload: { sectionId: section.id, itemId, field, value } });
    };

    return (
        <EditorSectionCard
            id={`custom-${section.id}`}
            title={section.title}
            icon={<Icons.Plus className="h-5 w-5 text-green-500" />}
            addItemAction={addItem}
            onDelete={deleteSection}
            onTitleChange={updateTitle}
            isDeletable={true}
            isTitleEditable={true}
        >
            {section.items.map((item) => (
                <div key={item.id} className="mb-4 p-3 bg-slate-50 rounded border border-slate-200 relative group">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <Input placeholder="Titre" value={item.title} onChange={(e) => handleChange(item.id, 'title', e.target.value)} className="font-medium bg-white" />
                        <Input placeholder="Sous-titre" value={item.subtitle} onChange={(e) => handleChange(item.id, 'subtitle', e.target.value)} className="bg-white" />
                        <Input placeholder="Date" value={item.date} onChange={(e) => handleChange(item.id, 'date', e.target.value)} className="bg-white col-span-2" />
                    </div>
                    <Input as="textarea" placeholder="Description" value={item.description} onChange={(e) => handleChange(item.id, 'description', e.target.value)} className="h-20 text-sm bg-white" />
                    <button onClick={() => deleteItem(item.id)} className="absolute -top-2 -right-2 text-red-400 bg-white border border-red-200 rounded-full p-0.5 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><Icons.Trash2 className="h-4 w-4" /></button>
                </div>
            ))}
        </EditorSectionCard>
    );
});
