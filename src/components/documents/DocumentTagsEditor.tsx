import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import { useDocumentTags, useAddDocumentTag, useRemoveDocumentTag } from '@/hooks/useDocumentTags';

interface DocumentTagsEditorProps {
  documentType: string;
  documentId: string;
}

export function DocumentTagsEditor({ documentType, documentId }: DocumentTagsEditorProps) {
  const { data: tags = [] } = useDocumentTags(documentType, documentId);
  const addTag = useAddDocumentTag();
  const removeTag = useRemoveDocumentTag();
  const [newTag, setNewTag] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAdd = () => {
    if (!newTag.trim()) return;
    addTag.mutate({ document_type: documentType, document_id: documentId, tag: newTag });
    setNewTag('');
    setShowInput(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <Badge key={t.id} variant="secondary" className="text-xs gap-1">
          {t.tag}
          <button
            onClick={() => removeTag.mutate(t.id)}
            className="ml-0.5 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {showInput ? (
        <Input
          className="h-6 w-24 text-xs"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          onBlur={() => { if (!newTag) setShowInput(false); }}
          placeholder="Tag..."
          autoFocus
        />
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
