import React, { memo, useRef } from 'react';
import { PersonalData, CVAction } from '../../types';
import * as Icons from '../Icons';
import { Input } from '../common/Input';
import { EditorSectionCard } from './EditorSectionCard';

interface Props {
    personalData: PersonalData;
    dispatch: React.Dispatch<CVAction>;
}

export const PersonalInfoForm: React.FC<Props> = memo(({ personalData, dispatch }) => {
    const photoInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        dispatch({
            type: 'UPDATE_PERSONAL',
            payload: {
                field: e.target.name as keyof PersonalData,
                value: e.target.value
            }
        });
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                dispatch({
                    type: 'UPDATE_PERSONAL',
                    payload: { field: 'photo', value: reader.result as string }
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const removePhoto = () => {
         dispatch({
            type: 'UPDATE_PERSONAL',
            payload: { field: 'photo', value: null }
        });
    }

    return (
        <EditorSectionCard
            id="personal-info"
            title="Infos Personnelles"
            icon={<Icons.User className="h-5 w-5 text-indigo-500" />}
        >
            <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center gap-4">
                  {personalData.photo ? (
                      <div className="relative group">
                          <img src={personalData.photo} alt="Profil" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
                           <button onClick={removePhoto} className="absolute inset-0 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icons.Trash2 className="w-6 h-6"/>
                           </button>
                      </div>
                  ) : (
                      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                          <Icons.User className="w-8 h-8 text-slate-400" />
                      </div>
                  )}
                  <div>
                    <button onClick={() => photoInputRef.current?.click()} className="text-sm bg-white border border-slate-300 px-3 py-1 rounded-md font-medium text-slate-700 hover:bg-slate-50">
                        {personalData.photo ? 'Changer la photo' : 'Choisir une photo'}
                    </button>
                    <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP. Carré de préférence.</p>
                  </div>
              </div>
              <Input name="firstName" placeholder="Prénom" value={personalData.firstName} onChange={handleChange} />
              <Input name="lastName" placeholder="Nom" value={personalData.lastName} onChange={handleChange} />
              <Input name="title" placeholder="Titre" value={personalData.title} onChange={handleChange} className="md:col-span-2 font-bold text-slate-700" />
              <Input as="textarea" name="summary" placeholder="Profil" value={personalData.summary} onChange={handleChange} className="h-24 text-sm md:col-span-2" />
              <Input name="email" placeholder="Email" value={personalData.email} onChange={handleChange} />
              <Input name="phone" placeholder="Tél" value={personalData.phone} onChange={handleChange} />
              <Input name="address" placeholder="Adresse" value={personalData.address} onChange={handleChange} className="md:col-span-2" />
              <Input name="infos" placeholder="Infos (Ex: Permis B, 25 ans)" value={personalData.infos} onChange={handleChange} className="md:col-span-2" />
              
              <div className="md:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="text-sm font-bold text-slate-600 mb-3">Réseaux & Portfolio</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <Icons.Linkedin className="h-5 w-5 text-slate-400 flex-shrink-0"/>
                        <Input name="linkedin" placeholder="linkedin.com/in/..." value={personalData.linkedin || ''} onChange={handleChange} className="bg-white" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Icons.Github className="h-5 w-5 text-slate-400 flex-shrink-0"/>
                        <Input name="github" placeholder="github.com/..." value={personalData.github || ''} onChange={handleChange} className="bg-white" />
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                        <Icons.Link className="h-5 w-5 text-slate-400 flex-shrink-0"/>
                        <Input name="portfolio" placeholder="Portfolio (your-site.com)" value={personalData.portfolio || ''} onChange={handleChange} className="bg-white" />
                    </div>
                 </div>
              </div>
            </div>
        </EditorSectionCard>
    );
});