import { CreateWorkspaceForm } from '@/modules/workspace/components/create-workspace-form';

export default function CreateWorkspacePage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm mt-6 xl:max-w-md">
        <CreateWorkspaceForm />
      </div>
    </div>
  );
}
