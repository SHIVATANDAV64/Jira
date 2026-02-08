import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { useCreateProject } from '@/hooks/useProjects';

interface ValidationErrors {
  name?: string;
  key?: string;
  description?: string;
}

export function CreateProject() {
  const navigate = useNavigate();
  const createProjectMutation = useCreateProject();

  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  const generateKey = (name: string) => {
    if (!name.trim()) return '';
    const words = name.trim().split(/\s+/);
    let key = '';
    
    if (words.length === 1) {
      // Single-word names: take first 3 chars
      key = (words[0] ?? '').substring(0, 3).toUpperCase();
    } else {
      // Multi-word names: take first letter of each word
      key = words.map(word => word[0]).join('').toUpperCase();
    }
    
    // Ensure key is 2-5 chars
    if (key.length < 2) {
      key = (name.substring(0, 5)).toUpperCase();
    }
    return key.substring(0, 5);
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Project name must be max 100 characters';
    }

    if (!formData.key.trim()) {
      newErrors.key = 'Project key is required';
    } else if (!/^[A-Z]+$/.test(formData.key)) {
      newErrors.key = 'Project key must contain only uppercase letters';
    } else if (formData.key.length < 2) {
      newErrors.key = 'Project key must be at least 2 characters';
    } else if (formData.key.length > 5) {
      newErrors.key = 'Project key must be max 5 characters';
    }

    if (formData.description.length > 2000) {
      newErrors.description = 'Description must be max 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const newKey = !formData.key || generateKey(formData.name) === formData.key
      ? generateKey(name)
      : formData.key;
    setFormData((prev) => ({
      ...prev,
      name,
      key: newKey,
    }));
    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value.toUpperCase();
    setFormData((prev) => ({
      ...prev,
      key: key.substring(0, 5),
    }));
    if (errors.key) setErrors(prev => ({ ...prev, key: undefined }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, description: e.target.value }));
    if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    createProjectMutation.mutate(
      {
        name: formData.name,
        key: formData.key,
        description: formData.description,
      },
      {
        onSuccess: (project) => {
          navigate(`/projects/${project.$id}`);
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[--color-text-secondary] hover:text-[--color-text-primary] mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">
          Create a new project
        </h1>
        <p className="mt-1 text-[--color-text-secondary]">
          Set up a new project to start tracking bugs and issues
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {createProjectMutation.error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {createProjectMutation.error.message}
          </div>
        )}

        <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6 space-y-6">
          <div>
            <Input
              label="Project name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g., Marketing Website"
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <Input
              label="Project key"
              value={formData.key}
              onChange={handleKeyChange}
              placeholder="e.g., MW"
              helperText="This key will be used as a prefix for all tickets (e.g., MW-1, MW-2)"
              maxLength={5}
              required
            />
            {errors.key && (
              <p className="mt-1 text-sm text-red-600">{errors.key}</p>
            )}
          </div>

          <div>
            <Textarea
              label="Description"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Describe what this project is about..."
              rows={4}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-[--color-text-muted]">
              {formData.description.length}/2000 characters
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={createProjectMutation.isPending}
            className="cursor-pointer"
          >
            Create Project
          </Button>
        </div>
      </form>
    </div>
  );
}
