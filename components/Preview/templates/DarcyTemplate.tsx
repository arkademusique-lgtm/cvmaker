import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import * as Icons from '../../Icons';
import { formatUrl } from './common';

// Custom skill rating component with dots like in the image
const DarcySkillRating: React.FC<{ level: number, colorClass: string, emptyColorClass?: string }> = ({ level, colorClass, emptyColorClass = 'bg-slate-700' }) => (
    <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map(star => (
            <div key={star} className={`w-3 h-3 rounded-full ${level >= star ? colorClass : emptyColorClass}`} />
        ))}
    </div>
);


export const DarcyTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius } = props;
    const initials = `${data.personal.firstName?.[0] || ''}${data.personal.lastName?.[0] || ''}`;

    const colorShade = 600; // A good default for this template
    const bgClass = `bg-${themeColor}-${colorShade}`;
    const textClass = `text-${themeColor}-${colorShade}`;

    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };

    const SidebarSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <section>
            <h3 className="text-sm font-bold tracking-widest text-slate-300 border-b border-slate-700 pb-2 mb-4 uppercase">{title}</h3>
            {children}
        </section>
    );

    const MainSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
        <section style={sectionStyle}>
            <h3 className={`text-xl font-bold uppercase mb-4 flex items-center gap-3 ${textClass}`}>
                {icon} {title}
            </h3>
            <div className="space-y-6">
                {children}
            </div>
        </section>
    );

    const Experiences: React.FC<{}> = () => (
        <MainSection title="Expériences" icon={<Icons.Briefcase className="h-5 w-5"/>}>
            {data.experiences.map((e, i) => (
                <div key={e.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                    <h4 className="font-bold text-lg text-slate-800">{e.role} - <span className="font-normal">{e.company}</span></h4>
                    <p className="text-sm text-slate-500 mb-1">{e.city} | {e.date}</p>
                    <p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p>
                </div>
            ))}
        </MainSection>
    );

    const Education: React.FC<{}> = () => (
        <MainSection title="Formation" icon={<Icons.GraduationCap className="h-5 w-5"/>}>
            {data.education.map((e, i) => (
                <div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                    <h4 className="font-bold text-lg text-slate-800">{e.degree}</h4>
                    <p className="text-sm text-slate-500 mb-1">{e.school}, {e.city} | {e.date}</p>
                    {e.description && <p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p>}
                </div>
            ))}
        </MainSection>
    );

     const CustomSections: React.FC<{}> = () => (
        <>
            {data.customSections.map(section => (
                <MainSection key={section.id} title={section.title} icon={<Icons.Plus className="h-5 w-5"/>}>
                    {section.items.map((item, i) => (
                         <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                            <h4 className="font-bold text-lg text-slate-800">{item.title} - <span className="font-normal">{item.subtitle}</span></h4>
                            <p className="text-sm text-slate-500 mb-1">{item.date}</p>
                            <p className="text-sm text-slate-600 whitespace-pre-line">{item.description}</p>
                        </div>
                    ))}
                </MainSection>
            ))}
        </>
    );

    const sectionComponents = {
        experiences: Experiences,
        education: Education,
        customSections: CustomSections,
    };
    
    const mainContentOrder = data.sectionOrder.filter(key => {
        if (key.startsWith('custom_')) {
            const sectionId = parseInt(key.split('_')[1], 10);
            return data.customSections.some(cs => cs.id === sectionId && cs.items.length > 0);
        }
        switch(key) {
            case 'experiences': return data.experiences.length > 0;
            case 'education': return data.education.length > 0;
            default: return false;
        }
    });

    return (
        <div className={`grid grid-cols-[75mm_1fr] h-[297mm] font-sans`}>
            {/* Sidebar */}
            <div className="bg-slate-900 text-white p-8 flex flex-col gap-8 print-color-adjust-exact">
                <div className="flex justify-center">
                    <div className={`w-24 h-24 rounded-full ${bgClass} flex items-center justify-center text-4xl font-bold`}>
                        {initials}
                    </div>
                </div>
                
                <SidebarSection title="Contact">
                    <div className="flex flex-col gap-3 text-sm text-slate-300 break-words">
                        {data.personal.phone && <div className="flex items-center gap-3"><Icons.Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />{data.personal.phone}</div>}
                        {data.personal.email && <div className="flex items-center gap-3"><Icons.Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />{data.personal.email}</div>}
                        {data.personal.address && <div className="flex items-start gap-3"><Icons.MapPin className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />{data.personal.address}</div>}
                        {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white"><Icons.Linkedin className="h-4 w-4 text-slate-400 flex-shrink-0" />{data.personal.linkedin}</a>}
                        {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white"><Icons.Github className="h-4 w-4 text-slate-400 flex-shrink-0" />{data.personal.github}</a>}
                        {visibility.portfolio && data.personal.portfolio && <a href={formatUrl(data.personal.portfolio)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white"><Icons.Link className="h-4 w-4 text-slate-400 flex-shrink-0" />{data.personal.portfolio}</a>}
                    </div>
                </SidebarSection>
                
                {data.skills.length > 0 && (
                    <SidebarSection title="Compétences">
                        <div className="flex flex-col gap-3">
                            {data.skills.map((s) => (
                                <div key={s.id} className="flex items-center justify-between text-sm">
                                    <span>{s.name}</span>
                                    {visibility.showSkillLevels && <DarcySkillRating level={s.level} colorClass={bgClass} />}
                                </div>
                            ))}
                        </div>
                    </SidebarSection>
                )}
                 {visibility.hobbies && data.hobbies.length > 0 && (
                    <SidebarSection title="Loisirs">
                        <div className="flex flex-wrap gap-2">
                            {data.hobbies.map((h, i) => (
                                <span key={i} style={roundedStyle} className="bg-slate-800 px-3 py-1 text-xs">{h}</span>
                            ))}
                        </div>
                    </SidebarSection>
                )}
            </div>

            {/* Main Content */}
            <div className="p-10 bg-white text-slate-700">
                <header className="mb-8">
                    <h1 className="text-5xl font-extrabold text-slate-800 uppercase tracking-wide">{data.personal.firstName} {data.personal.lastName}</h1>
                    <h2 className="text-xl text-slate-600 mt-1">{data.personal.title}</h2>
                    {visibility.infos && data.personal.infos && <p className="text-sm text-slate-500 mt-2">{data.personal.infos}</p>}
                    <div className={`mt-4 h-1 w-20 ${bgClass}`} />
                </header>
                
                {data.personal.summary && <p className="text-slate-600 italic mb-8" style={sectionStyle}>{data.personal.summary}</p>}
                
                {mainContentOrder.map(key => {
                    const Component = sectionComponents[key as keyof typeof sectionComponents] || (() => {
                        if (key.startsWith('custom_')) return <CustomSections />;
                        return null;
                    });
                    return Component ? <Component key={key} /> : null;
                })}
            </div>
        </div>
    );
});