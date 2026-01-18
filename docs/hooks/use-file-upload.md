# useFileUpload Hook

A flexible React hook for file uploads with drag-and-drop, validation, and preview generation.

## Features

- 📁 Single or multiple file uploads
- 🖱️ Drag and drop support
- 🔍 File type & size validation
- 🖼️ Image preview generation
- 🧹 Duplicate file detection
- ⚠️ Error handling
- 🎛️ Fully customizable

## Basic Usage

```tsx
import { useFileUpload } from "@/registry/default/hooks/use-file-upload";

function FileUploadComponent() {
  const [
    { files, isDragging, errors },
    { handleDragEnter, handleDragLeave, handleDrop, openFileDialog, removeFile },
  ] = useFileUpload({
    multiple: true,
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024,
    accept: "image/*",
  });

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button onClick={openFileDialog}>Select Files</button>

      {files.map((file) => (
        <div key={file.id}>
          {file.file.name} ({formatBytes(file.file.size)})
          <button onClick={() => removeFile(file.id)}>×</button>
        </div>
      ))}

      {errors.length > 0 && <div>{errors[0]}</div>}
    </div>
  );
}
```

## API Reference

### Options

| Option         | Type                              | Default      | Description                                  |
| -------------- | --------------------------------- | ------------ | -------------------------------------------- |
| `maxFiles`     | `number`                          | `Infinity`   | Max files (when `multiple` is true)         |
| `maxSize`      | `number`                          | `Infinity`   | Max file size in bytes                       |
| `accept`       | `string`                          | `"*"`        | Accepted types (e.g., `"image/*,application/pdf"`) |
| `multiple`     | `boolean`                         | `false`      | Allow multiple files                         |
| `initialFiles` | `FileMetadata[]`                  | `[]`         | Initial files to load                        |
| `onFilesChange` | `(files: FileWithPreview[]) => void` | `undefined`  | Callback when files change                   |
| `onFilesAdded` | `(addedFiles: FileWithPreview[]) => void` | `undefined`  | Callback when files are added                |

### Return Value

```typescript
// State
{
  files: FileWithPreview[];
  isDragging: boolean;
  errors: string[];
}

// Actions
{
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  clearErrors: () => void;
  handleDragEnter: (e: DragEvent) => void;
  handleDragLeave: (e: DragEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDrop: (e: DragEvent) => void;
  handleFileChange: (e: ChangeEvent) => void;
  openFileDialog: () => void;
  getInputProps: (props?) => InputHTMLAttributes & { ref };
}
```

### Types

```typescript
type FileMetadata = { name: string; size: number; type: string; url: string; id: string };
type FileWithPreview = { file: File | FileMetadata; id: string; preview?: string };
```

## Advanced Usage

### Upload Progress with XHR

```tsx
const [progress, setProgress] = useState<Record<string, number>>({});

const uploadFile = async (file: File, fileId: string) => {
  const xhr = new XMLHttpRequest();

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      setProgress((p) => ({ ...p, [fileId]: Math.round((e.loaded / e.total) * 100) }));
    }
  };

  xhr.open("POST", "/api/upload");
  xhr.send(new FormData().append("file", file));
};

const handleFilesAdded = (addedFiles: FileWithPreview[]) => {
  addedFiles.forEach((f) => f.file instanceof File && uploadFile(f.file, f.id));
};

const [{ files }, actions] = useFileUpload({ onFilesAdded: handleFilesAdded });
```

### Pause & Resume

```tsx
const pauseUpload = (xhr: XMLHttpRequest) => xhr.abort();
const resumeUpload = (file: File, uploadedBytes: number) => {
  const formData = new FormData();
  formData.append("file", file);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/upload");
  xhr.setRequestHeader("Content-Range", `bytes ${uploadedBytes}-${file.size - 1}/${file.size}`);
  xhr.send(formData);
};
```

### Chunked Uploads

```tsx
const uploadChunk = async (file: File, chunkIndex: number, totalChunks: number) => {
  const chunk = file.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
  const formData = new FormData();
  formData.append("file", chunk);
  await fetch("/api/upload-chunk", { method: "POST", body: formData });
};

for (let i = 0; i < totalChunks; i++) {
  await uploadChunk(file, i, totalChunks);
}
```

## Helpers

### formatBytes

```typescript
formatBytes(1024); // "1 KB"
formatBytes(1536, 1); // "1.5 KB"
```

## See Also

- [File Upload Page](https://coss.com/origin/file-upload) - Live demos and examples
