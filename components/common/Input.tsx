import React, { memo } from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    as?: 'input';
};

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: 'textarea';
};

type Props = InputProps | TextareaProps;

const baseClasses = "p-2 border border-slate-300 rounded w-full bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors";

export const Input: React.FC<Props> = memo((props) => {
    const { as = 'input', className, ...rest } = props;

    const combinedClassName = `${baseClasses} ${className || ''}`;

    if (as === 'textarea') {
        return <textarea {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} className={combinedClassName} />;
    }

    return <input {...(rest as React.InputHTMLAttributes<HTMLInputElement>)} className={combinedClassName} />;
});