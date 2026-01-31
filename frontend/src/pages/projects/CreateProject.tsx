import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { useCreateProject } from '@/hooks/useProjects';

export function CreateProject() {
  const navigate = useNavigate();
  const createProjectMutation = useCreateProject();

  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
  });

  const generateKey = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 5);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      key: prev.key || generateKey(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
          <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {createProjectMutation.error.message}
          </div>
        )}

        <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6 space-y-6">
          <Input
            label="Project name"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g., Marketing Website"
            required
          />

          <Input
            label="Project key"
            value={formData.key}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                key: e.target.value.toUpperCase(),
              }))
            }
            placeholder="e.g., MW"
            helperText="This key will be used as a prefix for all tickets (e.g., MW-1, MW-2)"
            maxLength={5}
            required
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Describe what this project is about..."
            rows={4}
          />
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
