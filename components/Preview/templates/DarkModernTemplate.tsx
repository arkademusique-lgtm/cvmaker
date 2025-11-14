import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import * as Icons from '../../Icons';
import { formatUrl, SkillRating, ProfilePhoto } from './common';
import { gradients } from '../../../constants';


export const DarkModernTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, useGradient, colorShade, photoShape } = props;
    const initials = `${data.personal.firstName?.[0] || ''}${data.personal.lastName?.[0] || ''}`;
    
    const bgClass = `bg-${themeColor}-${colorShade}`;
    const textClass = `text-${themeColor}-${colorShade}`;
    const borderClass = `border-${themeColor}-${Math.max(400, colorShade - 100)}`;
    const gradientStyle = useGradient ? { background: gradients[themeColor] } : {};
    
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };

    const SectionHeader = ({ title }: { title: string }) => (
        <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-6">{title}</h3>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Experiences: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <SectionHeader title="Expériences" />
            <div>
                {data.experiences.map((exp, i) => (
                    <div key={exp.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                        <div className="flex justify-between items-baseline">
                            <h4 className="text-lg font-bold text-white">{exp.role}</h4>
                            <span className="text-sm text-slate-400">{exp.date}</span>
                        </div>
                        <p className={`text-md font-semibold mb-2 ${textClass}`}>{exp.company}, {exp.city}</p>
                        <p className="text-sm text-slate-400 whitespace-pre-line">{exp.description}</p>
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
                {data.education.map((edu, i) => (
                    <div key={edu.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                        <div className="flex justify-between items-baseline">
                            <h4 className="text-lg font-bold text-white">{edu.degree}</h4>
                            <span className="text-sm text-slate-400">{edu.date}</span>
                        </div>
                        <p className="text-md font-semibold text-slate-300">{edu.school}, {edu.city}</p>
                        <p className="text-sm text-slate-400 whitespace-pre-line">{edu.description}</p>
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
                                <h4 className="text-lg font-bold text-white">{item.title}</h4>
                                <span className="text-sm text-slate-400">{item.date}</span>
                            </div>
                            <p className={`text-md font-semibold mb-2 ${textClass}`}>{item.subtitle}</p>
                            <p className="text-sm text-slate-400 whitespace-pre-line">{item.description}</p>
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

    const sectionComponents = { experiences: Experiences, education: Education, customSections: CustomSections };
    const mainOrder = data.sectionOrder.filter(key => key in sectionComponents);

    return (
        <div className="h-[297mm] bg-slate-800 text-slate-300 font-sans grid grid-cols-[80mm_1fr] print-color-adjust-exact">
            <div className="bg-slate-900 p-8 flex flex-col gap-8">
                <div className="text-center">
                     <ProfilePhoto
                        photo={data.personal.photo}
                        initials={initials}
                        photoShape={photoShape}
                        style={{}}
                        className={`w-28 h-28 border-4 ${borderClass} mx-auto mb-4`}
                        textClassName="text-4xl font-bold text-white"
                    />
                </div>
                
                <section>
                    <h3 className={`font-bold uppercase tracking-widest text-sm mb-4 pb-2 border-b border-slate-700 ${textClass}`}>Contact</h3>
                    <div className="space-y-3 text-sm break-words">
                        {data.personal.phone && <div className="flex items-center gap-3"><Icons.Phone className="h-4 w-4 text-slate-400"/> {data.personal.phone}</div>}
                        {data.personal.email && <div className="flex items-center gap-3"><Icons.Mail className="h-4 w-4 text-slate-400"/> {data.personal.email}</div>}
                        {data.personal.address && <div className="flex items-center gap-3"><Icons.MapPin className="h-4 w-4 text-slate-400"/> {data.personal.address}</div>}
                        {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white"><Icons.Linkedin className="h-4 w-4 text-slate-400"/> LinkedIn</a>}
                        {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white"><Icons.Github className="h-4 w-4 text-slate-400"/> GitHub</a>}
                        {visibility.portfolio && data.personal.portfolio && <a href={formatUrl(data.personal.portfolio)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white"><Icons.Link className="h-4 w-4 text-slate-400"/> Portfolio</a>}
                    </div>
                </section>

                {data.skills.length > 0 && (
                    <section>
                         <h3 className={`font-bold uppercase tracking-widest text-sm mb-4 pb-2 border-b border-slate-700 ${textClass}`}>Compétences</h3>
                         <div className="flex flex-col gap-2">
                            {data.skills.map((skill) => (
                                <div key={skill.id} className="flex items-center justify-between text-sm">
                                    <span>{skill.name}</span>
                                    {visibility.showSkillLevels && <SkillRating level={skill.level} colorClass={bgClass} />}
                                </div>
                            ))}
                         </div>
                    </section>
                )}

                {visibility.hobbies && data.hobbies.length > 0 && (
                    <section>
                        <h3 className={`font-bold uppercase tracking-widest text-sm mb-4 pb-2 border-b border-slate-700 ${textClass}`}>Loisirs</h3>
                        <p className="text-sm">{data.hobbies.join(', ')}</p>
                    </section>
                )}
            </div>

            <div className="p-10">
                <header className="mb-10">
                    <h1 className="text-5xl font-extrabold text-white">{data.personal.firstName} <span className={textClass}>{data.personal.lastName}</span></h1>
                    <h2 className="text-2xl font-light text-slate-300 mt-2">{data.personal.title}</h2>
                    {visibility.infos && data.personal.infos && <p className="text-sm text-slate-400 mt-2">{data.personal.infos}</p>}
                </header>
                
                {data.personal.summary && (
                    <section style={sectionStyle}>
                        <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-4">Profil</h3>
                        <p className="text-slate-300 leading-relaxed border-l-4 border-slate-700 pl-4">{data.personal.summary}</p>
                    </section>
                )}

                {mainOrder.map(key => {
                    const SectionComponent = sectionComponents[key as keyof typeof sectionComponents];
                    return SectionComponent && shouldRenderSection(key) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                })}
            </div>
        </div>
    );
});