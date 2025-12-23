'use client';

import { useState } from 'react';

interface ZipUploaderProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
  language: 'ru' | 'en';
}

export default function ZipUploader({ onUpload, disabled, language }: ZipUploaderProps) {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
        setZipFile(file);
        onUpload(file);
      } else {
        alert(language === 'ru' ? 'Пожалуйста, загрузите ZIP файл' : 'Please upload a ZIP file');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setZipFile(file);
      onUpload(file);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
        dragActive
          ? 'border-green-500 bg-green-500/10'
          : 'border-gray-600 hover:border-green-500'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".zip"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        id="zip-upload"
      />
      <label htmlFor="zip-upload" className="cursor-pointer block">
        {zipFile ? (
          <div className="text-green-400">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-medium text-lg">{zipFile.name}</p>
            <p className="text-sm text-gray-400 mt-2">
              {(zipFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {language === 'ru' ? 'Нажмите для выбора другого файла' : 'Click to select another file'}
            </p>
          </div>
        ) : (
          <div className="text-gray-400">
            <div className="text-5xl mb-3">📦</div>
            <p className="font-medium text-lg mb-2">
              {language === 'ru' ? 'Нажмите для выбора ZIP файла' : 'Click to select ZIP file'}
            </p>
            <p className="text-sm text-gray-500">
              {language === 'ru' ? 'или перетащите файл сюда' : 'or drag and drop here'}
            </p>
            <p className="text-xs text-gray-600 mt-3">
              {language === 'ru' ? 'Макс. размер: 50 MB' : 'Max size: 50 MB'}
            </p>
          </div>
        )}
      </label>
    </div>
  );
}
