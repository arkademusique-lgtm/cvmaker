import React, { useState, useRef } from 'react';
import { Template, ThemeColor, FontFamily, VisibilitySettings, FontSize, PhotoShape } from '../types';
import { useCVData } from '../hooks/useCVData';

import { EditorPanel } from './Editor/EditorPanel';
import { PreviewPanel } from './Preview/PreviewPanel';
import { AIAssistant } from './AI/AIAssistant';
import * as Icons from './Icons';

// Fix: Add types for window properties from externally loaded scripts
declare global {
  interface Window {
    pdfjsLib: any;
    html2pdf: any;
  }
}

const CVBuilder = () => {
  const [activeTab, setActiveTab] = useState('editor');
  const [showAI, setShowAI] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CV Data State (from custom hook) ---
  const { cvData, dispatch, importCvFromText } = useCVData();

  // --- DESIGN STATE ---
  const [currentTemplate, setCurrentTemplate] = useState<Template>('sidebar'); 
  const [themeColor, setThemeColor] = useState<ThemeColor>('indigo');
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [sectionSpacing, setSectionSpacing] = useState(8); // Corresponds to mb-8, 2rem
  const [itemSpacing, setItemSpacing] = useState(6); // Corresponds to space-y-6, 1.5rem
  const [lineHeight, setLineHeight] = useState(1.5); // Corresponds to leading-normal
  const [showDesignPanel, setShowDesignPanel] = useState(false);
  // New design states
  const [borderRadius, setBorderRadius] = useState(8); // 0-24px
  const [useGradient, setUseGradient] = useState(false);
  const [colorShade, setColorShade] = useState(600); // 400-800
  const [photoShape, setPhotoShape] = useState<PhotoShape>('round');


  // --- VISIBILITY STATE ---
  const [visibility, setVisibility] = useState<VisibilitySettings>({
    linkedin: true,
    github: true,
    portfolio: true,
    hobbies: true,
    infos: true,
    showSkillLevels: true,
  });
  
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setShowAI(true); // Open AI panel to show progress

    try {
      if (!window.pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Le chargement de la librairie PDF a échoué."));
          document.head.appendChild(script);
        });
      }

      if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Robust text extraction based on coordinates
        const items = textContent.items.slice().sort((a: any, b: any) => {
            if (Math.abs(a.transform[5] - b.transform[5]) > 5) {
                return b.transform[5] - a.transform[5]; // Sort primarily by Y (top to bottom)
            }
            return a.transform[4] - b.transform[4]; // Then by X (left to right)
        });

        let lastY = -1;
        let pageText = "";
        for (const item of items) {
            if (!item.str.trim()) continue; // Skip empty items

            if (lastY !== -1) {
                if (Math.abs(item.transform[5] - lastY) > item.height * 1.5) {
                     pageText += '\n\n'; // Paragraph break
                } else if (Math.abs(item.transform[5] - lastY) > 2) {
                    pageText += '\n'; // Line break
                } else {
                    pageText += ' '; // Space between words on the same line
                }
            }
            pageText += item.str;
            lastY = item.transform[5];
        }
        fullText += pageText + "\n\n";
      }
      
      fullText = fullText.replace(/\n{3,}/g, '\n\n').replace(/ {2,}/g, ' ').trim();

      await importCvFromText(fullText);

    } catch (error) {
      console.error("PDF Parsing Error:", error);
      const message = error instanceof Error ? error.message : "Une erreur inconnue est survenue lors de l'analyse du PDF.";
      setImportError(message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async () => {
    setIsGeneratingPdf(true);
    if (window.innerWidth < 1024 && activeTab !== 'preview') {
      setActiveTab('preview');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    const element = document.getElementById('cv-preview');
    if (!element) {
        alert("Erreur: L'élément de prévisualisation du CV n'a pas été trouvé.");
        setIsGeneratingPdf(false);
        return;
    }

    const opt = {
      margin: 0,
      filename: `CV_${cvData.personal.lastName || 'CV'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      if (!window.html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Le chargement de la librairie de génération PDF a échoué."));
          document.head.appendChild(script);
        });
      }
      await window.html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF Generation Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Une erreur inconnue est survenue.";
      alert(`Erreur lors de la génération du PDF: ${errorMessage}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const fontClass = fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : fontFamily === 'script' ? "font-['Dancing_Script',_cursive]" : 'font-sans';

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-800 relative ${fontClass}`}>
      
      <input type="file" ref={fileInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />

      <header className="bg-white text-slate-800 p-4 shadow-sm border-b border-slate-200 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Icons.FileText className="h-6 w-6 text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900">CV Maker <span className="text-indigo-600">Ultra</span></h1>
          </div>
          <div className="flex gap-2 md:gap-4">
            <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className={`flex items-center gap-2 px-3 py-2 rounded font-medium transition border ${isImporting ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'}`}>
              {isImporting ? <Icons.Loader className="h-4 w-4 animate-spin"/> : <Icons.Upload className="h-4 w-4" />} <span className="hidden md:inline">{isImporting ? "..." : "Importer"}</span>
            </button>
            <button onClick={() => setShowDesignPanel(!showDesignPanel)} className={`flex items-center gap-2 px-3 py-2 rounded font-medium transition border ${showDesignPanel ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'}`}>
               <Icons.Palette className="h-5 w-5" /> <span className="hidden md:inline">Design</span>
            </button>
            <button onClick={() => setShowAI(!showAI)} className={`flex items-center gap-2 px-3 py-2 rounded font-medium transition border ${showAI ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-300 hover:bg-slate-100 text-indigo-600'}`}>
              <Icons.Bot className="h-5 w-5" /> <span className="hidden md:inline">IA</span>
            </button>
            <button onClick={handleDownload} disabled={isGeneratingPdf} className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 md:px-4 md:py-2 rounded font-medium transition shadow-sm ${isGeneratingPdf ? 'opacity-75' : ''}`}>
              {isGeneratingPdf ? <Icons.Loader className="h-4 w-4 animate-spin"/> : <Icons.Download className="h-4 w-4" />} <span className="hidden md:inline">PDF</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col lg:flex-row gap-6 h-[calc(100vh-68px)] print:h-auto print:w-full print:max-w-none print:p-0">
        
        <EditorPanel 
          cvData={cvData} 
          dispatch={dispatch} 
          showDesignPanel={showDesignPanel}
          setShowDesignPanel={setShowDesignPanel}
          designProps={{ 
              currentTemplate, setCurrentTemplate, 
              themeColor, setThemeColor, 
              fontFamily, setFontFamily,
              fontSize, setFontSize,
              sectionSpacing, setSectionSpacing,
              itemSpacing, setItemSpacing,
              lineHeight, setLineHeight,
              borderRadius, setBorderRadius,
              useGradient, setUseGradient,
              colorShade, setColorShade,
              photoShape, setPhotoShape
          }}
          visibility={visibility}
          setVisibility={setVisibility}
          className={activeTab === 'preview' ? 'hidden lg:flex' : 'flex'}
        />

        <PreviewPanel 
          cvData={cvData}
          template={currentTemplate}
          themeColor={themeColor}
          fontFamily={fontFamily}
          fontSize={fontSize}
          visibility={visibility}
          sectionSpacing={sectionSpacing}
          itemSpacing={itemSpacing}
          lineHeight={lineHeight}
          borderRadius={borderRadius}
          useGradient={useGradient}
          colorShade={colorShade}
          photoShape={photoShape}
          className={activeTab === 'editor' ? 'hidden lg:flex' : 'flex'}
        />
      </main>

      {showAI && (
        <AIAssistant 
          cvData={cvData}
          dispatch={dispatch}
          onClose={() => {
              setShowAI(false);
              setImportError(null);
          }}
          isImporting={isImporting}
          importError={importError}
        />
      )}

      <div className="lg-hidden fixed bottom-0 left-0 w-full bg-white border-t flex z-40 print:hidden">
        <button onClick={() => setActiveTab('editor')} className={`flex-1 p-3 flex justify-center items-center gap-2 font-medium ${activeTab === 'editor' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'}`}><Icons.FileText className="h-5 w-5" /> Éditeur</button>
        <button onClick={() => setActiveTab('preview')} className={`flex-1 p-3 flex justify-center items-center gap-2 font-medium ${activeTab === 'preview' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'}`}><Icons.User className="h-5 w-5" /> Aperçu</button>
      </div>
    </div>
  );
};

export default CVBuilder;