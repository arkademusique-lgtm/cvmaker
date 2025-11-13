import React, { useState, useEffect, useRef, memo } from 'react';
import { CVData, CVAction, AIMessage, Suggestion } from '../../types';
import { getAIResponse } from '../../services/geminiService';
import * as Icons from '../Icons';

interface SuggestionCardProps {
    suggestion: Suggestion;
    onApply: (suggestion: Suggestion) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onApply }) => (
    <div className="bg-white border border-indigo-200 rounded-lg p-3 my-2 shadow-sm">
        <p className="text-xs font-semibold text-indigo-700 mb-2">Suggestion pour : {suggestion.field === 'summary' ? 'Profil' : 'Description de l\'expérience'}</p>
        <div className="space-y-2 text-xs">
            <div className="bg-red-50 text-red-800 p-2 rounded border border-red-200">
                <strong className="block mb-1">Avant :</strong>
                <p className="line-through">{suggestion.original}</p>
            </div>
            <div className="bg-green-50 text-green-800 p-2 rounded border border-green-200">
                <strong className="block mb-1">Après :</strong>
                <p>{suggestion.suggestion}</p>
            </div>
        </div>
        <button 
            onClick={() => onApply(suggestion)}
            className="mt-3 w-full text-xs bg-indigo-500 text-white font-semibold py-1 px-3 rounded hover:bg-indigo-600 transition-colors"
        >
            Appliquer la suggestion
        </button>
    </div>
);


interface AIAssistantProps {
    cvData: CVData;
    dispatch: React.Dispatch<CVAction>;
    onClose: () => void;
    isImporting: boolean;
    importError: string | null;
}

export const AIAssistant: React.FC<AIAssistantProps> = memo(({ cvData, dispatch, onClose, isImporting, importError }) => {
    const [aiInput, setAiInput] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiMessages, setAiMessages] = useState<AIMessage[]>([
        { role: 'assistant', content: "Bonjour ! Je suis votre assistant CV. Comment puis-je vous aider à perfectionner votre CV aujourd'hui ? Vous pouvez me demander de modifier des informations, d'améliorer votre style, ou me poser des questions." }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevIsImporting = useRef(isImporting);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [aiMessages]);

    useEffect(() => {
        if (isImporting && !prevIsImporting.current) {
             setAiMessages(prev => [...prev, { role: 'assistant', content: "Analyse du PDF en cours... Cela peut prendre quelques secondes." }]);
        }
        if (!isImporting && prevIsImporting.current && !importError) {
             setAiMessages(prev => [...prev, { role: 'assistant', content: "J'ai analysé votre CV ! Vérifiez les informations dans l'éditeur. Vous pouvez me demander des améliorations." }]);
        }
        prevIsImporting.current = isImporting;
    }, [isImporting, importError]);
    
    useEffect(() => {
        if (importError) {
            setAiMessages(prev => [...prev, { role: 'assistant', content: `Désolé, une erreur s'est produite lors de l'import: ${importError}` }]);
        }
    }, [importError]);

    const handleSendMessage = async (messageToSend?: string) => {
        const userMsg = messageToSend || aiInput;
        if (!userMsg.trim()) return;
        
        setAiInput("");
        setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setAiLoading(true);

        try {
            const response = await getAIResponse(userMsg, cvData);
            if (response.type === 'chat') {
                setAiMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
            } else if (response.type === 'update') {
                dispatch({ type: 'UPDATE_FROM_AI', payload: response.content });
                setAiMessages(prev => [...prev, { role: 'assistant', content: "J'ai mis à jour votre CV !" }]);
            } else if (response.type === 'suggestion') {
                 setAiMessages(prev => [...prev, { 
                     role: 'assistant', 
                     content: "Voici quelques suggestions pour améliorer votre CV :",
                     suggestions: response.content
                }]);
            }
        } catch (error) {
            console.error("Error with Gemini API:", error);
            const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
            setAiMessages(prev => [...prev, { role: 'assistant', content: `Désolé, une erreur s'est produite: ${errorMessage}` }]);
        } finally {
            setAiLoading(false);
        }
    };

    const handleApplySuggestion = (suggestion: Suggestion) => {
        if (suggestion.field === 'summary') {
            dispatch({ type: 'UPDATE_PERSONAL', payload: { field: 'summary', value: suggestion.suggestion } });
        } else if (suggestion.field === 'experience.description' && suggestion.itemId) {
            dispatch({ type: 'UPDATE_ITEM', payload: { section: 'experiences', id: suggestion.itemId, field: 'description', value: suggestion.suggestion }});
        }

        setAiMessages(prev => {
            const newMessages = prev.map(msg => ({
                ...msg,
                suggestions: msg.suggestions?.filter(s => s !== suggestion)
            }));
            return [...newMessages, { role: 'assistant', content: "Parfait, c'est appliqué !" }];
        });
    };
    
    const handleSuggestImprovements = () => {
      handleSendMessage("Peux-tu me suggérer des améliorations pour mon résumé et mes expériences ?");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-50 duration-200">
                <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2"><Icons.Sparkles className="h-5 w-5 text-yellow-300" /><h2 className="font-bold">Assistant CV</h2></div>
                    <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-full"><Icons.X className="h-5 w-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {aiMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                {msg.content}
                                {msg.suggestions && msg.suggestions.length > 0 && (
                                    <div className="mt-2">
                                        {msg.suggestions.map((s, s_idx) => (
                                            <SuggestionCard key={s_idx} suggestion={s} onApply={handleApplySuggestion} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {(aiLoading || isImporting) && (
                         <div className="flex justify-start">
                             <div className="bg-white border border-slate-200 p-3 rounded-lg rounded-bl-none shadow-sm">
                                 <Icons.Loader className="h-4 w-4 animate-spin text-indigo-600" />
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 bg-white border-t border-slate-200">
                    <div className="flex gap-2">
                        <button 
                            onClick={handleSuggestImprovements} 
                            disabled={aiLoading || isImporting}
                            className="p-2 border border-slate-300 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors flex-shrink-0"
                            title="Suggérer des améliorations"
                        >
                            <Icons.Sparkles className="h-5 w-5" />
                        </button>
                        <input
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Message..."
                            className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition bg-white text-slate-900"
                            disabled={aiLoading || isImporting}
                        />
                        <button onClick={() => handleSendMessage()} disabled={aiLoading || isImporting || !aiInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg disabled:opacity-50 transition-colors">
                            <Icons.Send className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});