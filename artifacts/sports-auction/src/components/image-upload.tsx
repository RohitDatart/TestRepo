import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Upload, Link, X, Image as ImageIcon } from 'lucide-react';
import { getAuthHeaders, resolveImageUrl } from '@/lib/utils';

interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  className?: string;
}

export function ImageUpload({ label = "Photo", value, onChange, className }: ImageUploadProps) {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);

      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/upload/image`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Upload failed');
      }

      const data = await res.json();
      onChange(data.url);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const clearImage = () => {
    onChange('');
    setError('');
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>

      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-white/10 w-fit">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors",
            mode === 'url' ? "bg-primary text-black" : "text-muted-foreground hover:text-white"
          )}
        >
          <Link className="w-3 h-3" /> URL
        </button>
        <button
          type="button"
          onClick={() => setMode('file')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors",
            mode === 'file' ? "bg-primary text-black" : "text-muted-foreground hover:text-white"
          )}
        >
          <Upload className="w-3 h-3" /> Upload
        </button>
      </div>

      {/* Input Area */}
      {mode === 'url' ? (
        <div className="relative">
          <Input
            type="text"
            value={value || ''}
            onChange={e => onChange(resolveImageUrl(e.target.value))}
            placeholder="https://example.com/photo.jpg or Google Drive link"
          />
          {value && (
            <button type="button" onClick={clearImage} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div>
          <label
            className={cn(
              "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
              uploading ? "border-primary/50 bg-primary/5" : "border-white/10 hover:border-primary/30 hover:bg-white/5"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading ? (
              <div className="flex items-center gap-2 text-primary text-sm font-bold">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Uploading...
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Upload className="w-6 h-6 mx-auto mb-1" />
                <span className="text-xs">Click to select image (max 5MB)</span>
              </div>
            )}
          </label>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
      )}

      {/* Preview */}
      {value && (
        <div className="flex items-center gap-3 p-2 bg-black/20 rounded-lg border border-white/5">
          <img
            src={value}
            alt="Preview"
            className="w-12 h-12 rounded-lg object-cover border border-white/10"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{value}</p>
          </div>
          <button type="button" onClick={clearImage} className="text-muted-foreground hover:text-destructive flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
