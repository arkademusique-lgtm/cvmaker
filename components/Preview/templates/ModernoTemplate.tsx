import React, { memo } from 'react';
import { CVData, ThemeColor, VisibilitySettings, PhotoShape } from '../../../types';
import { formatUrl } from './common';
import { gradients } from '../../../constants';

interface Props {
    data: CVData;
    themeColor: ThemeColor;
    visibility: VisibilitySettings;
    sectionSpacing: number;
    itemSpacing: number;
    borderRadius: number;
    useGradient: boolean;
    colorShade: number;
    photoShape: PhotoShape;
}

export const ModernoTemplate: React.FC<Props> = memo(({ data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius, useGradient, colorShade, photoShape }) => {
    const initials = `${data.personal.firstName?.[0] || ''}${data.personal.lastName?.[0] || ''}`;
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };

    const bgClass = `bg-${themeColor}-${colorShade}`;
    const textClass = `text-${themeColor}-${colorShade}`;
    const borderClass = `border-${themeColor}-${Math.max(400, colorShade - 100)}`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;
    const gradientStyle = useGradient ? { background: gradients[themeColor] } : {};
    
    const photoOrInitials = (
        <div 
            style={{ 
                ...(photoShape === 'round' ? { borderRadius: '9999px'} : roundedStyle),
                ...(useGradient ? gradientStyle : {}),
            }} 
            className={`w-28 h-28 ${!useGradient ? bgClass : ''} flex items-center justify-center text-4xl font-bold text-white border-8 border-white shadow-lg relative overflow-hidden`}
        >
            {data.personal.photo ? (
                <img src={data.personal.photo} alt="Profil" className="w-full h-full object-cover" />
            ) : (
                initials
            )}
        </div>
    );
    
    return (
        <div className={`h-full min-h-[297mm] bg-white font-sans`}>
            <div style={useGradient ? gradientStyle : {}} className={`${!useGradient ? bgClass : ''} h-[80mm] print-color-adjust-exact text-white p-10 flex flex-col justify-center text-center relative`}>
                <h1 className="text-4xl font-bold uppercase mb-1">{data.personal.firstName} {data.personal.lastName}</h1>
                <h2 className="text-xl opacity-90 font-light">{data.personal.title}</h2>
                <div className="flex justify-center gap-x-4 gap-y-1 text-xs opacity-80 mt-3 flex-wrap">
                    {data.personal.phone && <span>{data.personal.phone}</span>}
                    {data.personal.email && <span>{data.personal.email}</span>}
                    {data.personal.address && <span>{data.personal.address}</span>}
                </div>
                 <div className="flex justify-center gap-x-4 gap-y-1 text-xs opacity-80 mt-1 flex-wrap">
                    {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.linkedin}</a>}
                    {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.github}</a>}
                    {visibility.portfolio && data.personal.portfolio && <a href={formatUrl(data.personal.portfolio)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.portfolio}</a>}
                </div>
            </div>
            
            <div className="absolute top-[60mm] left-1/2 -translate-x-1/2">
                {photoOrInitials}
            </div>

            <div className="p-10 pt-20 grid grid-cols-12 gap-8">
                <div className="col-span-8">
                     {data.personal.summary && (
                        <section style={sectionStyle}>
                            <p className="text-sm text-center text-slate-600">{data.personal.summary}</p>
                        </section>
                     )}
                     {data.experiences.length > 0 && (
                        <section style={sectionStyle}>
                            <h3 className={`text-sm font-bold border-b-2 ${borderClass} pb-1 mb-4 uppercase ${textDarkClass}`}>Expériences</h3>
                            {data.experiences.map((e, i) => (
                                <div key={e.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page relative pl-6">
                                    <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-white ring-2 ${borderClass} ${bgClass}`}></div>
                                    <div className="text-xs text-slate-400 text-right">{e.date}</div>
                                    <h4 className="font-bold text-md">{e.role}</h4>
                                    <div className="text-sm italic mb-1 text-slate-500">{e.company}, {e.city}</div>
                                    <p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p>
                                </div>
                            ))}
                        </section>
                    )}
                    {data.customSections.map(section => (
                        <section key={section.id} style={sectionStyle}>
                            <h3 className={`text-sm font-bold border-b-2 ${borderClass} pb-1 mb-4 uppercase ${textDarkClass}`}>{section.title}</h3>
                            {section.items.map((item, i) => (
                                <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page relative pl-6">
                                    <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-white ring-2 ${borderClass} ${bgClass}`}></div>
                                    <div className="text-xs text-slate-400 text-right">{item.date}</div>
                                    <h4 className="font-bold text-md">{item.title}</h4>
                                    <div className="text-sm italic mb-1 text-slate-500">{item.subtitle}</div>
                                    <p className="text-sm text-slate-600 whitespace-pre-line">{item.description}</p>
                                </div>
                            ))}
                        </section>
                    ))}
                </div>
                <div className="col-span-4">
                    {data.skills.length > 0 && (
                        <section style={sectionStyle}>
                            <h3 className={`text-sm font-bold border-b-2 ${borderClass} pb-1 mb-3 uppercase ${textDarkClass}`}>Compétences</h3>
                            <ul className="text-sm space-y-1 text-slate-700">
                                {data.skills.map(s => <li key={s.id}>{s.name}</li>)}
                            </ul>
                        </section>
                    )}
                    {data.education.length > 0 && (
                        <section style={sectionStyle}>
                            <h3 className={`text-sm font-bold border-b-2 ${borderClass} pb-1 mb-3 uppercase ${textDarkClass}`}>Formation</h3>
                            {data.education.map((e, i) => (
                                <div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                                    <h4 className="font-bold text-md">{e.degree}</h4>
                                    <div className="text-sm text-slate-500">{e.school}, {e.city}</div>
                                    <div className="text-xs text-slate-400">{e.date}</div>
                                </div>
                            ))}
                        </section>
                    )}
                     {visibility.hobbies && data.hobbies.length > 0 && (
                        <section>
                            <h3 className={`text-sm font-bold border-b-2 ${borderClass} pb-1 mb-3 uppercase ${textDarkClass}`}>Loisirs</h3>
                            <p className="text-sm text-slate-600">{data.hobbies.join(', ')}</p>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
});