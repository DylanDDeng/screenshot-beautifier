interface CapturePreviewProps {
  imageBase64: string;
  onEdit: () => void;
  onCopy: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

export function CapturePreview({
  imageBase64,
  onEdit,
  onCopy,
  onSave,
  onDiscard,
}: CapturePreviewProps) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl shadow-2xl max-w-sm">
      <img
        src={`data:image/png;base64,${imageBase64}`}
        alt="Screenshot preview"
        className="max-w-full max-h-48 rounded-lg border border-gray-200 object-contain"
      />
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onCopy}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
        >
          Copy
        </button>
        <button
          onClick={onSave}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onDiscard}
          className="px-3 py-1.5 bg-gray-100 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
