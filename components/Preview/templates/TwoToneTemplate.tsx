import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import * as Icons from '../../Icons';
import { formatUrl, SkillRating } from './common';
import { gradients } from '../../../constants';

export const TwoToneTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, useGradient, colorShade } = props;
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };

    const bgClass = `bg-${themeColor}-${colorShade}`;
    const borderClass = `border-${themeColor}-${Math.max(400, colorShade - 100)}`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;
    const gradientStyle = useGradient ? { background: gradients[themeColor] } : {};
    
    const SectionHeader = ({ title }: { title: string }) => (
        <h3 className={`text-xl font-bold uppercase tracking-wider mb-6 pb-2 border-b-2 ${borderClass} ${textDarkClass}`}>{title}</h3>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Experiences: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <SectionHeader title="Expériences" />
            <div>
                {data.experiences.map((e, i) => (
                    <div key={e.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                        <div className="flex justify-between items-baseline">
                            <h4 className="font-bold text-lg">{e.role}</h4>
                            <span className="text-sm text-slate-500">{e.date}</span>
                        </div>
                        <p className="text-sm italic text-slate-500 mb-1">{e.company}, {e.city}</p>
                        <p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Education: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <SectionHeader title="Formation" />
            <div>
                 {data.education.map((e, i) => (
                    <div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                        <div className="flex justify-between items-baseline">
                            <h4 className="font-bold text-lg">{e.degree}</h4>
                            <span className="text-sm text-slate-500">{e.date}</span>
                        </div>
                        <p className="text-sm text-slate-500">{e.school}, {e.city}</p>
                         <p className="text-xs text-slate-500 whitespace-pre-line">{e.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
    
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const CustomSections: React.FC<{style: React.CSSProperties}> = (p) => (
        <div style={p.style}>
            {data.customSections.map(section => (
                <section key={section.id} className="mb-6">
                    <SectionHeader title={section.title} />
                    {section.items.map((item, i) => (
                        <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                            <div className="flex justify-between items-baseline">
                                <h4 className="font-bold text-lg">{item.title}</h4>
                                <span className="text-sm text-slate-500">{item.date}</span>
                            </div>
                            <p className="text-sm italic text-slate-500 mb-1">{item.subtitle}</p>
                            <p className="text-sm text-slate-600 whitespace-pre-line">{item.description}</p>
                        </div>
                    ))}
                </section>
            ))}
        </div>
    );

    const shouldRenderSection = (section: string) => {
        switch(section) {
            case 'experiences': return data.experiences.length > 0;
            case 'education': return data.education.length > 0;
            case 'customSections': return data.customSections.length > 0;
            default: return false;
        }
    };

    const mainComponents = { experiences: Experiences, education: Education, customSections: CustomSections };
    const mainOrder = data.sectionOrder.filter(key => key in mainComponents);

    return (
        <div className="h-[297mm] grid grid-cols-[85mm_1fr] font-sans">
            <div style={useGradient ? gradientStyle : {}} className={`p-8 ${!useGradient ? bgClass : ''} text-white flex flex-col gap-10 print-color-adjust-exact`}>
                <header>
                    <h1 className="text-4xl font-bold leading-tight">{data.personal.firstName}</h1>
                    <h1 className="text-4xl font-bold leading-tight">{data.personal.lastName}</h1>
                    <p className="text-lg opacity-80 mt-2">{data.personal.title}</p>
                    {visibility.infos && data.personal.infos && <p className="text-xs opacity-70 mt-2">{data.personal.infos}</p>}
                </header>

                <section>
                    <h3 className="uppercase tracking-widest font-bold text-sm mb-4 border-b border-white/30 pb-2">Contact</h3>
                    <div className="text-sm space-y-3 break-all">
                        {data.personal.phone && <div className="flex items-center gap-3"><Icons.Phone className="h-4 w-4 opacity-70"/>{data.personal.phone}</div>}
                        {data.personal.email && <div className="flex items-center gap-3"><Icons.Mail className="h-4 w-4 opacity-70"/>{data.personal.email}</div>}
                        {data.personal.address && <div className="flex items-center gap-3"><Icons.MapPin className="h-4 w-4 opacity-70"/>{data.personal.address}</div>}
                        {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-100 opacity-80"><Icons.Linkedin className="h-4 w-4"/>LinkedIn</a>}
                        {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-100 opacity-80"><Icons.Github className="h-4 w-4"/>GitHub</a>}
                        {visibility.portfolio && data.personal.portfolio && <a href={formatUrl(data.personal.portfolio)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-100 opacity-80"><Icons.Link className="h-4 w-4"/>Portfolio</a>}
                    </div>
                </section>

                {data.skills.length > 0 && (
                    <section>
                        <h3 className="uppercase tracking-widest font-bold text-sm mb-4 border-b border-white/30 pb-2">Compétences</h3>
                        <div className="flex flex-col gap-2">
                            {data.skills.map((s) => <div key={s.id} className="flex items-center justify-between text-sm"><span>{s.name}</span>{visibility.showSkillLevels && <SkillRating level={s.level} colorClass="bg-white" />}</div>)}
                        </div>
                    </section>
                )}
                
                 {visibility.hobbies && data.hobbies.length > 0 && (
                    <section>
                        <h3 className="uppercase tracking-widest font-bold text-sm mb-4 border-b border-white/30 pb-2">Loisirs</h3>
                        <p className="text-sm">{data.hobbies.join(', ')}</p>
                    </section>
                )}
            </div>

            <div className="p-10 bg-white text-slate-800">
                {data.personal.summary && (
                    <section style={sectionStyle}>
                        <SectionHeader title="Profil" />
                        <p className="text-sm text-slate-600 leading-relaxed">{data.personal.summary}</p>
                    </section>
                )}

                {mainOrder.map(key => {
                    const SectionComponent = mainComponents[key as keyof typeof mainComponents];
                    return SectionComponent && shouldRenderSection(key) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                })}
            </div>
        </div>
    );
});